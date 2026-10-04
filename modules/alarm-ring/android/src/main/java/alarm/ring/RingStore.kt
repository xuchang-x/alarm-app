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
)

/**
 * 计划持久化 + AlarmManager 调度封装。
 *
 * 调度策略：每个闹钟同一时刻只挂一个最近未来触发的精确闹钟，
 * 触发后由 AlarmReceiver 再排下一个（链式），避免 PendingIntent 数量膨胀。
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
            )
        }
        prefs(context).edit().putString(KEY_PLANS, array.toString()).apply()
    }

    /** 全量重排：先取消所有已挂的 PendingIntent，再按各自最近未来触发重挂 */
    fun rescheduleAll(context: Context) {
        val plans = loadPlans(context)
        for (plan in plans) {
            cancelPending(context, plan.alarmId)
            scheduleNext(context, plan)
        }
    }

    /** 为单个计划挂最近的未来触发（无未来触发则不挂） */
    fun scheduleNext(context: Context, plan: RingPlan) {
        val now = System.currentTimeMillis()
        val next = plan.triggers.filter { it > now }.minOrNull() ?: return
        val am = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
        val pi = triggerPendingIntent(context, plan.alarmId)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S && !am.canScheduleExactAlarms()) {
            // 未授予精确闹钟权限：降级为非精确触发（可能延迟数分钟，但不丢）
            am.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, next, pi)
        } else {
            am.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, next, pi)
        }
    }

    fun cancelPending(context: Context, alarmId: Int) {
        val am = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
        am.cancel(triggerPendingIntent(context, alarmId))
    }

    /** 追加贪睡触发（now + snoozeMinutes）并立即重挂该闹钟的最近触发 */
    fun scheduleSnooze(context: Context, alarmId: Int) {
        val plan = loadPlans(context).firstOrNull { it.alarmId == alarmId } ?: return
        val snoozeAt = System.currentTimeMillis() + plan.snoozeMinutes * 60_000L
        val updated = plan.copy(triggers = plan.triggers + snoozeAt)
        upsertPlan(context, updated)
        cancelPending(context, alarmId)
        scheduleNext(context, updated)
    }

    /** 精确闹钟权限是否可用（Android 12 以下恒为 true） */
    fun canScheduleExact(context: Context): Boolean {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S) return true
        val am = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
        return am.canScheduleExactAlarms()
    }

    private fun triggerPendingIntent(context: Context, alarmId: Int): PendingIntent {
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
}
