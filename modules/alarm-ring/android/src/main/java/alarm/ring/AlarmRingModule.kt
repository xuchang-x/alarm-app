package alarm.ring

import android.content.Intent
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

/**
 * 原生闹钟响铃模块入口。
 *
 * JS API：
 * - syncAlarms(plans)      全量同步响铃计划（按 alarmId upsert）并重排
 * - cancelAlarm(alarmId)   移除计划并取消已挂的触发
 * - scheduleSnooze(alarmId) 追加一次贪睡触发
 * - stopRinging()          停止当前响铃服务
 * - canScheduleExactAlarms() 精确闹钟权限状态
 */
class AlarmRingModule : Module() {

    override fun definition() = ModuleDefinition {

        Name("AlarmRing")

        AsyncFunction("syncAlarms") { plans: List<Map<String, Any?>> ->
            val context = appContext.reactContext ?: return@AsyncFunction false
            for (raw in plans) {
                val alarmId = (raw["alarmId"] as? Number)?.toInt() ?: continue
                val triggers = (raw["triggers"] as? List<*>)?.mapNotNull {
                    (it as? Number)?.toLong()
                } ?: emptyList()
                RingStore.upsertPlan(
                    context,
                    RingPlan(
                        alarmId = alarmId,
                        title = raw["title"] as? String ?: "闹钟",
                        body = raw["body"] as? String ?: "",
                        triggers = triggers,
                        snoozeMinutes = (raw["snoozeMinutes"] as? Number)?.toInt() ?: 10,
                        ringDurationSeconds = (raw["ringDurationSeconds"] as? Number)?.toInt() ?: 30,
                        soundId = raw["soundId"] as? String,
                        soundUri = raw["soundUri"] as? String,
                    )
                )
            }
            RingStore.rescheduleAll(context)
            true
        }

        AsyncFunction("cancelAlarm") { alarmId: Double ->
            val context = appContext.reactContext
                ?: return@AsyncFunction Unit
            RingStore.removePlan(context, alarmId.toInt())
        }

        AsyncFunction("scheduleSnooze") { alarmId: Double ->
            val context = appContext.reactContext
                ?: return@AsyncFunction Unit
            RingStore.scheduleSnooze(context, alarmId.toInt())
        }

        AsyncFunction("stopRinging") {
            val context = appContext.reactContext
                ?: return@AsyncFunction Unit
            // 先同步清响铃快照：JS 侧响铃浮层每秒轮询 getRingingInfo，
            // 若等 ACTION_STOP 异步生效，快照残留会让浮层关闭后 1 秒内再次弹出
            RingService.ringingInfo = null
            // 走服务内 ACTION_STOP 完整停止流程（清快照/停播放/摘前台通知/stopSelf），
            // 不用 stopService：后者只触发 onDestroy，历史实现中快照清不掉导致浮层复现。
            // 调用方在 App 前台（浮层点击），startService 不受后台启动限制；
            // 也不用 startForegroundService，避免服务已停时触发
            // ForegroundServiceDidNotStartInTimeException
            context.startService(
                Intent(context, RingService::class.java).setAction(RingService.ACTION_STOP)
            )
        }

        Function("canScheduleExactAlarms") {
            val context = appContext.reactContext ?: return@Function false
            RingStore.canScheduleExact(context)
        }

        // ── 响铃浮层（响铃时 App 内展示关闭/稍后提醒入口）──
        // 同步读当前响铃快照，null = 未在响铃。JS 侧 RingOverlayHost 轮询。
        Function("getRingingInfo") {
            val snap = RingService.ringingInfo ?: return@Function null
            mapOf(
                "alarmId" to snap.alarmId,
                "title" to snap.title,
                "body" to snap.body,
                "snoozeMinutes" to snap.snoozeMinutes,
            )
        }

        // ── 皮肤主题（008 深色模式）──
        // JS 侧在 bundle 求值时同步读这里定型 SKIN（模块级 StyleSheet 会冻结色值），
        // 切换主题 = setSkinTheme + JS 重载，详见 src/constants/theme.ts。
        // 注：模块级同步函数的 DSL 是 Function（注册到 syncFunctions），
        // expo-modules-core 未暴露 SyncFunction 标识符。
        Function("getSkinTheme") {
            val context = appContext.reactContext ?: return@Function "system"
            RingStore.getSkinTheme(context)
        }

        Function("setSkinTheme") { theme: String ->
            val context = appContext.reactContext ?: return@Function Unit
            RingStore.setSkinTheme(context, theme)
        }
    }
}
