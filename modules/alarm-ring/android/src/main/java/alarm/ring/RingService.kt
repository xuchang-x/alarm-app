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
import android.net.Uri
import android.os.Build
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat

/**
 * 响铃前台服务：
 * - MediaPlayer 以 USAGE_ALARM + isLooping 循环播放选定的铃声（三级回退）
 * - 到 ringDurationSeconds 自动停止（时长感知：短音循环补齐、长音截断）
 * - 通知带「关闭 / 稍后提醒」action，贪睡由 RingStore 原生重排
 */
class RingService : Service() {

    companion object {
        const val CHANNEL_ID = "alarm-ring-channel"
        const val ACTION_STOP = "alarm.ring.STOP"
        const val ACTION_SNOOZE = "alarm.ring.SNOOZE"
        /** 响铃停止广播（含关闭/贪睡/30秒自动停）：响铃 Activity 收到后自动退出 */
        const val ACTION_RING_STOPPED = "alarm.ring.STOPPED"
        private const val NOTIFICATION_ID = 2001

        /**
         * 当前响铃快照（响铃浮层）：响铃开始置位，停止/贪睡后清空。
         * JS 侧 RingOverlayHost 每秒轮询 getRingingInfo，App 在前台时展示
         * 带「关闭/稍后提醒」的浮层，不再单点依赖通知横幅的可见性。
         */
        @Volatile
        var ringingInfo: RingingSnapshot? = null
    }

    /** 响铃快照：浮层展示与操作所需的最小字段集 */
    data class RingingSnapshot(
        val alarmId: Int,
        val title: String,
        val body: String,
        val snoozeMinutes: Int,
    )

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
        val snoozeMinutes = intent?.getIntExtra("snoozeMinutes", 10) ?: 10
        val durationSeconds = intent?.getIntExtra("ringDurationSeconds", 30) ?: 30
        val soundId = intent?.getStringExtra("soundId")
        val soundUri = intent?.getStringExtra("soundUri")

        ringingInfo = RingingSnapshot(alarmId, title, body, snoozeMinutes)
        startForeground(NOTIFICATION_ID, buildNotification(title, body, snoozeMinutes))
        logNotificationDiagnostics()
        startPlaying(soundId, soundUri)

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

    private fun startPlaying(soundId: String?, soundUri: String?) {
        stopPlaying()
        val uri = resolveSoundUri(soundId, soundUri)
        if (uri == null) {
            android.util.Log.w("RingService", "三级回退后仍无可用铃声，仅展示通知")
            return
        }
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

    /**
     * 铃声三级回退（007）：任何一层失效都不中断响铃。
     *
     * 1. soundUri（本地音乐 content:// URI）：ContentResolver openInputStream 探测可解析
     * 2. soundId（内置音 raw 资源名）：resources.getIdentifier 命中模块 res/raw 资源
     * 3. 系统默认闹钟铃声：RingtoneManager TYPE_ALARM，再退 TYPE_RINGTONE
     */
    private fun resolveSoundUri(soundId: String?, soundUri: String?): Uri? {
        // 1. 本地音乐 URI：探测可解析才用（App 重装/文件删除后 URI 会失效）
        if (!soundUri.isNullOrBlank()) {
            try {
                contentResolver.openInputStream(Uri.parse(soundUri))?.use { /* 探测可读 */ }
                return Uri.parse(soundUri)
            } catch (e: Exception) {
                android.util.Log.w("RingService", "本地音乐 URI 已失效，回退内置音", e)
            }
        }

        // 2. 内置音 raw 资源（模块资源名与 soundId 一致，`ars_` 前缀）
        //    两级查找：debug/不收缩时命中模块 res/raw/ars_*；
        //    release 开资源收缩时模块 raw 会被裁掉（getIdentifier 动态引用
        //    无法被静态分析），但 JS 侧 assets/sounds 经 RN 插件派生的
        //    raw/assets_sounds_ars_* 始终在包内，用前缀名兜底命中。
        if (!soundId.isNullOrBlank()) {
            val resId = resources.getIdentifier(soundId, "raw", packageName)
            if (resId == 0) {
                val assetsResId =
                    resources.getIdentifier("assets_sounds_$soundId", "raw", packageName)
                if (assetsResId != 0) {
                    return Uri.parse("android.resource://$packageName/$assetsResId")
                }
                android.util.Log.w("RingService", "内置音资源未命中：$soundId，回退系统默认")
            } else {
                return Uri.parse("android.resource://$packageName/$resId")
            }
        }

        // 3. 系统默认闹钟铃声
        return RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM)
            ?: RingtoneManager.getDefaultUri(RingtoneManager.TYPE_RINGTONE)
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
        ringingInfo = null
        // 通知响铃 Activity（若已拉起）自动退出，避免铃停后界面残留
        sendBroadcast(Intent(ACTION_RING_STOPPED).setPackage(packageName))
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

    private fun buildNotification(title: String, body: String, snoozeMinutes: Int): android.app.Notification {
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
        // 全屏弹窗意图（Android 10+ 闹钟类 App 标准行为，AOSP/Google 时钟同构）：
        // 指向专用响铃 Activity（盖锁屏+亮屏，原生 UI 零冷启动延迟），
        // 息屏/锁屏/App 在后台被杀时都直接全屏展示响铃界面；
        // 权限受限时系统自动降级为 heads-up 横幅，仍有关闭/稍后提醒入口
        val fullScreenPi = PendingIntent.getActivity(
            this, 1,
            AlarmRingActivity.createIntent(this, title, body, snoozeMinutes),
            flags
        )

        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setSmallIcon(android.R.drawable.ic_lock_idle_alarm)
            .setContentTitle(title)
            .setContentText(body)
            .setPriority(NotificationCompat.PRIORITY_MAX)
            .setCategory(NotificationCompat.CATEGORY_ALARM)
            .setOngoing(true)
            .setContentIntent(contentPi)
            .setFullScreenIntent(fullScreenPi, true)
            .setSound(null) // 声音由 MediaPlayer 承载，避免双声
            .setVibrate(longArrayOf(0, 250, 250, 250))
            .addAction(0, "稍后提醒", snoozePi)
            .addAction(0, "关闭", stopPi)
            .build()
    }

    /**
     * 诊断日志：响铃通知不可见时打出原因（权限被拒/渠道被降级），方便 adb logcat 排查。
     * 对应典型现象：铃声在响但看不到任何通知，无法关闭闹钟。
     */
    private fun logNotificationDiagnostics() {
        if (!NotificationManagerCompat.from(this).areNotificationsEnabled()) {
            android.util.Log.w(
                "RingService",
                "应用通知权限未授予：响铃通知不可见，用户将无法通过通知关闭闹钟，请引导开启通知权限"
            )
            return
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = getSystemService(NotificationManager::class.java)
                .getNotificationChannel(CHANNEL_ID)
            if (channel != null && channel.importance < NotificationManager.IMPORTANCE_HIGH) {
                android.util.Log.w(
                    "RingService",
                    "通知渠道重要性为 ${channel.importance}（低于 HIGH）：横幅/弹窗可能不展示，" +
                        "多为系统或用户在设置中关闭了该渠道"
                )
            }
        }
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
