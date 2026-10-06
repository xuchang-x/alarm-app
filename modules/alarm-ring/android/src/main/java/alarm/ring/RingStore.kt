package alarm.ring

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.content.SharedPreferences
import android.os.Build
import org.json.JSONArray
import org.json.JSONObject

/**
 * 单个闹钟的响铃计划。
 *
 * JS 层用 computeRingDatesInRange 全量算出未来触发时间戳后同步过来；
 * 原生侧持久化到 SharedPreferences，App 被杀 / 设备重启后仍可重排。
 */
data class RingPlan(
    val alarmId: Int,
    val title: String,
    val body: String,
    /** 未来触发时间戳（epoch ms，升序不保证，调度时取最近未来项） */
    val triggers: List<Long>,
    val snoozeMinutes: Int,
    val ringDurationSeconds: Int,
    /** 内置提示音 raw 资源名（res/raw，如 'ars_classic_alarm'，JS 层已从语义 id 映射），null = 系统默认闹钟铃声 */
    val soundId: String?,
    /** 本地音乐 content:// URI，优先级高于 soundId；失效时回退到系统默认 */
    val soundUri: String?,
)

/** 触发时间迟到的容忍窗口：超过该窗口的过期触发不再补响 */
private const val MISSED_GRACE_MS = 15 * 60_000L

/**
 * 计划持久化 + AlarmManager 调度封装。
 *
 * 调度策略（业界标准，同 AOSP DeskClock / Google Clock）：
 * 全局单槽 setAlarmClock()——系统只保留每个 App 最近一次 alarm clock，
 * 因此永远只挂「所有计划中最近的未来触发」，触发后全局重选。
 * 相比 setExactAndAllowWhileIdle 的优势：
 * 1. Doze 豁免：系统会在触发前主动提前退出低电耗模式（官方文档明确）；
 * 2. 状态栏 / 锁屏展示闹钟图标与下次响铃时间（用户可感知「已设上」）；
 * 3. ROM 电池策略对 alarm clock 类闹钟区别对待，杀后台后存活率最高。
 */
object RingStore {

    private const val PREFS = "alarm_ring_store"
    private const val KEY_PLANS = "plans"
    private const val ACTION_TRIGGER = "alarm.ring.TRIGGER"

    private fun prefs(context: Context): SharedPreferences =
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)

    fun upsertPlan(context: Context, plan: RingPlan) {
        val plans = loadPlans(context).filter { it.alarmId != plan.alarmId } + plan
        savePlans(context, plans)
    }

    fun removePlan(context: Context, alarmId: Int) {
        savePlans(context, loadPlans(context).filter { it.alarmId != alarmId })
        cancelPending(context, alarmId)
    }

    fun loadPlans(context: Context): List<RingPlan> {
        val raw = prefs(context).getString(KEY_PLANS, null) ?: return emptyList()
        return try {
            val array = JSONArray(raw)
            (0 until array.length()).mapNotNull { i ->
                val obj = array.getJSONObject(i)
                val triggers = obj.getJSONArray("triggers").let { ts ->
                    (0 until ts.length()).map { j -> ts.getLong(j) }
                }
                RingPlan(
                    alarmId = obj.getInt("alarmId"),
                    title = obj.optString("title", "闹钟"),
                    body = obj.optString("body", ""),
                    triggers = triggers,
                    snoozeMinutes = obj.optInt("snoozeMinutes", 10),
                    ringDurationSeconds = obj.optInt("ringDurationSeconds", 30),
                    // 0.0.4 及更早的旧持久化数据无铃声字段：optString 缺省空串归一化为 null。
                    // 注意 optString 对显式 JSON null（JSONObject.NULL）会返回字符串 "null"，
                    // 必须用 opt + as? String，否则 RingService 会把 "null" 当本地音乐 URI 打开。
                    soundId = (obj.opt("soundId") as? String)?.ifBlank { null },
                    soundUri = (obj.opt("soundUri") as? String)?.ifBlank { null },
                )
            }
        } catch (_: Exception) {
            emptyList()
        }
    }

    private fun savePlans(context: Context, plans: List<RingPlan>) {
        val array = JSONArray()
        for (plan in plans) {
            val triggers = JSONArray()
            for (t in plan.triggers) triggers.put(t)
            array.put(
                JSONObject()
                    .put("alarmId", plan.alarmId)
                    .put("title", plan.title)
                    .put("body", plan.body)
                    .put("triggers", triggers)
                    .put("snoozeMinutes", plan.snoozeMinutes)
                    .put("ringDurationSeconds", plan.ringDurationSeconds)
                    .put("soundId", plan.soundId ?: JSONObject.NULL)
                    .put("soundUri", plan.soundUri ?: JSONObject.NULL)
            )
        }
        prefs(context).edit().putString(KEY_PLANS, array.toString()).apply()
    }

    /** 全量重排：清掉旧式逐闹钟挂载后，全局重挂最近的未来触发 */
    fun rescheduleAll(context: Context) {
        for (plan in loadPlans(context)) {
            // 兼容清理：0.1.4 及更早版本逐闹钟挂载的 PendingIntent
            cancelPending(context, plan.alarmId)
        }
        scheduleNext(context)
    }

    /** 全局重挂：取所有计划中最近的未来触发，以 alarm clock 身份挂载（无未来触发则取消） */
    fun scheduleNext(context: Context) {
        val am = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
        val now = System.currentTimeMillis()
        val next = loadPlans(context)
            .flatMap { plan -> plan.triggers.filter { it > now } }
            .minOrNull()
        if (next == null) {
            am.cancel(triggerPendingIntent(context))
            return
        }
        val pi = triggerPendingIntent(context)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S && !am.canScheduleExactAlarms()) {
            // 未授予精确闹钟权限：setAlarmClock 会抛 SecurityException，降级为非精确触发
            am.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, next, pi)
        } else {
            am.setAlarmClock(
                AlarmManager.AlarmClockInfo(next, showPendingIntent(context)),
                pi,
            )
        }
    }

    fun cancelPending(context: Context, alarmId: Int) {
        val am = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
        am.cancel(legacyTriggerPendingIntent(context, alarmId))
    }

    /** 追加贪睡触发（now + snoozeMinutes）并全局重挂 */
    fun scheduleSnooze(context: Context, alarmId: Int) {
        val plan = loadPlans(context).firstOrNull { it.alarmId == alarmId } ?: return
        val snoozeAt = System.currentTimeMillis() + plan.snoozeMinutes * 60_000L
        upsertPlan(context, plan.copy(triggers = plan.triggers + snoozeAt))
        scheduleNext(context)
    }

    /** 精确闹钟权限是否可用（Android 12 以下恒为 true） */
    fun canScheduleExact(context: Context): Boolean {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S) return true
        val am = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
        return am.canScheduleExactAlarms()
    }

    // ── 皮肤主题（008 深色模式）──
    // JS bundle 求值阶段同步读取以定型 SKIN，切换时由设置页写入后重载 JS。
    private const val KEY_SKIN_THEME = "skin_theme"

    /** 读取主题偏好：system / light / dark，缺省 system */
    fun getSkinTheme(context: Context): String =
        prefs(context).getString(KEY_SKIN_THEME, null) ?: "system"

    /** 写入主题偏好（JS 侧已校验取值范围） */
    fun setSkinTheme(context: Context, theme: String) {
        prefs(context).edit().putString(KEY_SKIN_THEME, theme).apply()
    }

    /** 已到点的计划及其触发时间（含 [MISSED_GRACE_MS] 容忍窗口内的迟到触发） */
    fun duePlan(context: Context): Pair<RingPlan, Long>? {
        val now = System.currentTimeMillis()
        return loadPlans(context)
            .mapNotNull { plan ->
                plan.triggers
                    .filter { it <= now && now - it <= MISSED_GRACE_MS }
                    .minOrNull()
                    ?.let { plan to it }
            }
            .minByOrNull { it.second }
    }

    /** 清掉所有计划中已过期的触发时间戳，防止迟到窗口内重复响铃，随后全局重挂 */
    fun purgePastTriggersAndReschedule(context: Context) {
        val now = System.currentTimeMillis()
        val plans = loadPlans(context).map { it.copy(triggers = it.triggers.filter { t -> t > now }) }
        savePlans(context, plans)
        scheduleNext(context)
    }

    private fun triggerPendingIntent(context: Context): PendingIntent {
        val intent = Intent(context, AlarmReceiver::class.java).apply {
            action = ACTION_TRIGGER
        }
        return PendingIntent.getBroadcast(
            context,
            0,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
    }

    /** 旧版逐闹钟挂载的 PendingIntent（仅用于升级后清理） */
    private fun legacyTriggerPendingIntent(context: Context, alarmId: Int): PendingIntent {
        val intent = Intent(context, AlarmReceiver::class.java).apply {
            action = ACTION_TRIGGER
            putExtra("alarmId", alarmId)
        }
        return PendingIntent.getBroadcast(
            context,
            alarmId,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
    }

    /** 状态栏闹钟图标点击跳转：打开 App 主界面 */
    private fun showPendingIntent(context: Context): PendingIntent? {
        val launch = context.packageManager.getLaunchIntentForPackage(context.packageName)
            ?: return null
        return PendingIntent.getActivity(
            context,
            0,
            launch,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
    }
}
