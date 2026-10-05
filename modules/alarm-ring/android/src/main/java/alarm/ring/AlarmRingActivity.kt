package alarm.ring

import android.app.Activity
import android.app.KeyguardManager
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.os.Build
import android.os.Bundle
import android.view.WindowManager
import android.widget.TextView

/**
 * 响铃全屏界面（业界闹钟 App 标准做法，AOSP/Google 时钟同构）。
 *
 * 由 RingService 通知的 full-screen intent 拉起，覆盖场景：
 * - App 进程被杀：AlarmManager 唤醒进程触发 RingService 后 FSI 直接拉起本页，
 *   不经 JS 冷启动（原生 UI 秒出），响铃交互不再依赖 App 是否在前台
 * - 熄屏/锁屏：showWhenLocked + turnScreenOn 盖在锁屏上并自动亮屏
 * - 有密码的锁屏：界面显示在锁屏之上，直接可操作关闭/稍后提醒（不解锁）
 *
 * 铃声/振动由 RingService 承载，本页只负责展示与操作：
 * 关闭 → RingService ACTION_STOP；稍后提醒 → ACTION_SNOOZE；操作后自身 finish。
 * 服务侧停止响铃（含 30 秒自动停）会广播 ACTION_RING_STOPPED，本页收到后自动退出，
 * 避免铃声已停而响铃界面残留。
 */
class AlarmRingActivity : Activity() {

  private val ringStoppedReceiver = object : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
      finish()
    }
  }

  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)

    // API 27+：盖锁屏 + 自动亮屏；低版本用 window flag 等价实现
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
      setShowWhenLocked(true)
      setTurnScreenOn(true)
    } else {
      @Suppress("DEPRECATION")
      window.addFlags(
        WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED or
          WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON
      )
    }
    // 有密钥锁屏时允许在锁屏之上直接交互（关闭/贪睡无需解锁，AOSP 时钟同行为）
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
      (getSystemService(KeyguardManager::class.java))?.requestDismissKeyguard(this, null)
    }

    setContentView(R.layout.activity_alarm_ring)
    bindUi()

    val filter = IntentFilter(RingService.ACTION_RING_STOPPED)
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
      registerReceiver(ringStoppedReceiver, filter, RECEIVER_NOT_EXPORTED)
    } else {
      @Suppress("UnspecifiedRegisterReceiverFlag")
      registerReceiver(ringStoppedReceiver, filter)
    }
  }

  override fun onDestroy() {
    unregisterReceiver(ringStoppedReceiver)
    super.onDestroy()
  }

  private fun bindUi() {
    val snapshot = RingService.ringingInfo ?: run {
      // 未在响铃（如历史残留启动），直接退出
      finish()
      return
    }

    findViewById<TextView>(R.id.ring_title).text =
      intent.getStringExtra(EXTRA_TITLE) ?: snapshot.title
    findViewById<TextView>(R.id.ring_body).text =
      intent.getStringExtra(EXTRA_BODY)?.ifBlank { null } ?: snapshot.body

    val snoozeMinutes = intent.getIntExtra(EXTRA_SNOOZE_MINUTES, snapshot.snoozeMinutes)
    findViewById<TextView>(R.id.btn_snooze).text = "稍后 $snoozeMinutes 分钟"
    findViewById<TextView>(R.id.btn_snooze).setOnClickListener {
      startRingService(RingService.ACTION_SNOOZE)
      finish()
    }

    findViewById<TextView>(R.id.btn_stop).text = "关闭"
    findViewById<TextView>(R.id.btn_stop).setOnClickListener {
      startRingService(RingService.ACTION_STOP)
      finish()
    }
  }

  private fun startRingService(action: String) {
    val intent = Intent(this, RingService::class.java).setAction(action)
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      startForegroundService(intent)
    } else {
      startService(intent)
    }
  }

  companion object {
    private const val EXTRA_TITLE = "title"
    private const val EXTRA_BODY = "body"
    private const val EXTRA_SNOOZE_MINUTES = "snoozeMinutes"

    /** 构造启动 intent：CLEAR_TASK 保证新响铃覆盖旧响铃界面 */
    fun createIntent(context: Context, title: String, body: String, snoozeMinutes: Int): Intent =
      Intent(context, AlarmRingActivity::class.java)
        .setFlags(
          Intent.FLAG_ACTIVITY_NEW_TASK or
            Intent.FLAG_ACTIVITY_CLEAR_TASK or
            Intent.FLAG_ACTIVITY_EXCLUDE_FROM_RECENTS
        )
        .putExtra(EXTRA_TITLE, title)
        .putExtra(EXTRA_BODY, body)
        .putExtra(EXTRA_SNOOZE_MINUTES, snoozeMinutes)
  }
}
