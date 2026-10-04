package alarm.ring

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

/**
 * 设备重启 / 应用更新后重排所有持久化的闹钟计划。
 */
class BootReceiver : BroadcastReceiver() {

    override fun onReceive(context: Context, intent: Intent) {
        when (intent.action) {
            Intent.ACTION_BOOT_COMPLETED,
            Intent.ACTION_MY_PACKAGE_REPLACED -> RingStore.rescheduleAll(context)
        }
    }
}
