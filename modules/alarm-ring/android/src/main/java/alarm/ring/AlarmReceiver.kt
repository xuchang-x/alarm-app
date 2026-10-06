package alarm.ring

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.Build

/**
 * 闹钟触发接收器：启动响铃前台服务，并全局重挂下一次触发。
 *
 * 调度走全局单槽 setAlarmClock()（业界标准，同 AOSP DeskClock），
 * PendingIntent 不携带 alarmId，到点后由「已过期触发时间」推断响哪个闹钟；
 * 响铃后清掉所有过期触发并全局重挂。
 *
 * 说明：alarm clock 触发的广播属于后台启动前台服务的豁免场景，
 * 且系统会在触发前主动退出 Doze，App 被杀后仍可正常拉起响铃。
 */
class AlarmReceiver : BroadcastReceiver() {

    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action != ACTION_TRIGGER) return

        val (plan, _) = RingStore.duePlan(context) ?: return

        val service = Intent(context, RingService::class.java).apply {
            putExtra("alarmId", plan.alarmId)
            putExtra("title", plan.title)
            putExtra("body", plan.body)
            putExtra("snoozeMinutes", plan.snoozeMinutes)
            putExtra("ringDurationSeconds", plan.ringDurationSeconds)
            putExtra("soundId", plan.soundId)
            putExtra("soundUri", plan.soundUri)
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            context.startForegroundService(service)
        } else {
            context.startService(service)
        }

        // 清掉所有过期触发（含本次与同分钟撞车的其他闹钟），再全局重挂下一次
        RingStore.purgePastTriggersAndReschedule(context)
    }

    companion object {
        private const val ACTION_TRIGGER = "alarm.ring.TRIGGER"
    }
}
