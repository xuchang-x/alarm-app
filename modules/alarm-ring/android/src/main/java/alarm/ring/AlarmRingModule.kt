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
            context.stopService(Intent(context, RingService::class.java))
        }

        Function("canScheduleExactAlarms") {
            val context = appContext.reactContext ?: return@Function false
            RingStore.canScheduleExact(context)
        }

        // ── 皮肤主题（008 深色模式）──
        // JS 侧在 bundle 求值时同步读这里定型 SKIN（模块级 StyleSheet 会冻结色值），
        // 切换主题 = setSkinTheme + JS 重载，详见 src/constants/theme.ts。
        SyncFunction("getSkinTheme") {
            val context = appContext.reactContext ?: return@SyncFunction "system"
            RingStore.getSkinTheme(context)
        }

        Function("setSkinTheme") { theme: String ->
            val context = appContext.reactContext ?: return@Function Unit
            RingStore.setSkinTheme(context, theme)
        }
    }
}
