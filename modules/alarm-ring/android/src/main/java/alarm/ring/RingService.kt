package alarm.ring

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.media.AudioAttributes
import android.media.MediaPlayer
import android.media.RingtoneManager
import android.os.Build
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import androidx.core.app.NotificationCompat

/**
 * 响铃前台服务：
 * - MediaPlayer 以 USAGE_ALARM + isLooping 循环播放系统默认闹钟铃声
 * - 到 ringDurationSeconds 自动停止（时长感知：短音循环补齐、长音截断）
 * - 通知带「关闭 / 稍后提醒」action，贪睡由 RingStore 原生重排
 */
class RingService : Service() {

    companion object {
        const val CHANNEL_ID = "alarm-ring-channel"
        const val ACTION_STOP = "alarm.ring.STOP"
        const val ACTION_SNOOZE = "alarm.ring.SNOOZE"
        private const val NOTIFICATION_ID = 2001
    }

    private var player: MediaPlayer? = null
    private val stopHandler = Handler(Looper.getMainLooper())
    private var alarmId = -1

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        when (intent?.action) {
            ACTION_STOP -> {
                stopRinging()
                return START_NOT_STICKY
            }
            ACTION_SNOOZE -> {
                if (alarmId > 0) {
                    RingStore.scheduleSnooze(this, alarmId)
                }
                stopRinging()
                return START_NOT_STICKY
            }
        }

        alarmId = intent?.getIntExtra("alarmId", -1) ?: -1
        val title = intent?.getStringExtra("title") ?: "闹钟"
        val body = intent?.getStringExtra("body") ?: ""
        val durationSeconds = intent?.getIntExtra("ringDurationSeconds", 30) ?: 30

        startForeground(NOTIFICATION_ID, buildNotification(title, body))
        startPlaying()

        // 到时自动停（真正的时长控制点，改 30s→50s 只改 JS 常量）
        stopHandler.removeCallbacksAndMessages(null)
        stopHandler.postDelayed({ stopRinging() }, durationSeconds * 1_000L)
        return START_NOT_STICKY
    }

    override fun onDestroy() {
        stopHandler.removeCallbacksAndMessages(null)
        stopPlaying()
        super.onDestroy()
    }

    private fun startPlaying() {
        stopPlaying()
        val uri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM)
            ?: RingtoneManager.getDefaultUri(RingtoneManager.TYPE_RINGTONE)
        try {
            player = MediaPlayer().apply {
                setDataSource(this@RingService, uri)
                setAudioAttributes(
                    AudioAttributes.Builder()
                        .setUsage(AudioAttributes.USAGE_ALARM)
                        .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                        .build()
                )
                isLooping = true
                prepare()
                start()
            }
        } catch (e: Exception) {
            android.util.Log.w("RingService", "播放闹钟铃声失败，仅展示通知", e)
            player = null
        }
    }

    private fun stopPlaying() {
        player?.let {
            try {
                if (it.isPlaying) it.stop()
            } catch (_: IllegalStateException) {
                // 已停止的播放器再 stop 会抛，忽略
            } finally {
                it.release()
            }
        }
        player = null
    }

    private fun stopRinging() {
        stopHandler.removeCallbacksAndMessages(null)
        stopPlaying()
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
            stopForeground(STOP_FOREGROUND_REMOVE)
        } else {
            @Suppress("DEPRECATION")
            stopForeground(true)
        }
        stopSelf()
    }

    private fun buildNotification(title: String, body: String): android.app.Notification {
        ensureChannel(this)

        val flags = PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE

        val stopPi = PendingIntent.getService(
            this, alarmId + 100_000,
            Intent(this, RingService::class.java).setAction(ACTION_STOP), flags
        )
        val snoozePi = PendingIntent.getService(
            this, alarmId + 200_000,
            Intent(this, RingService::class.java).setAction(ACTION_SNOOZE), flags
        )
        val contentPi = packageManager.getLaunchIntentForPackage(packageName)?.let {
            PendingIntent.getActivity(this, 0, it, flags)
        }

        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setSmallIcon(android.R.drawable.ic_lock_idle_alarm)
            .setContentTitle(title)
            .setContentText(body)
            .setPriority(NotificationCompat.PRIORITY_MAX)
            .setCategory(NotificationCompat.CATEGORY_ALARM)
            .setOngoing(true)
            .setContentIntent(contentPi)
            .setSound(null) // 声音由 MediaPlayer 承载，避免双声
            .setVibrate(longArrayOf(0, 250, 250, 250))
            .addAction(0, "稍后提醒", snoozePi)
            .addAction(0, "关闭", stopPi)
            .build()
    }

    private fun ensureChannel(context: Context) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
        val manager = context.getSystemService(NotificationManager::class.java)
        if (manager.getNotificationChannel(CHANNEL_ID) != null) return
        manager.createNotificationChannel(
            NotificationChannel(
                CHANNEL_ID,
                "闹钟响铃",
                NotificationManager.IMPORTANCE_MAX
            ).apply {
                description = "闹钟响铃（循环播放直至关闭或到时）"
                setSound(null, null)
                enableVibration(true)
                vibrationPattern = longArrayOf(0, 250, 250, 250)
            }
        )
    }
}
