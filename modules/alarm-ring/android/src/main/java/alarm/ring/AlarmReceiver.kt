package alarm.ring

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.Build

/**
 * 闹钟触发接收器：启动响铃前台服务，并链式排该闹钟的下一次触发。
 *
 * 说明：精确闹钟（setExactAndAllowWhileIdle）触发的广播属于
 * 后台启动前台服务的豁免场景，App 被杀后仍可正常拉起响铃。
 */
class AlarmReceiver : BroadcastReceiver() {

    override fun onReceive(context: Context, intent: Intent) {
        val alarmId = intent.getIntExtra("alarmId", -1)
        if (alarmId <= 0) return

        val plan = RingStore.loadPlans(context).firstOrNull { it.alarmId == alarmId } ?: return

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

        // 链式排下一次（刚触发的时间戳已过期，天然被过滤）
        RingStore.scheduleNext(context, plan)
    }
}
