# Android 构建环境笔记

记录 2026-10-02 首次跑通 Android Dev Build 时踩的三个环境坑。这些全是**机器环境问题**，项目代码零改动，所以排查思路比结论更重要。

## 坑一：NDK 目录是空壳

**现象**：构建报大量 `CXX5101 NDK folder does not contain 'platforms'`，`configureCMakeDebug` 任务失败。

**根因**：`~/Library/Android/sdk/ndk/27.1.12297006` 只有 8KB——当年安装被中断了，目录里剩一个 `source.properties` 和 `.installer` 残留。目录存在但不完整，比不存在更迷惑人。

**排查技巧**：`du -sh` 一下 NDK 目录，正常的 r27b 应该有 2.4G 左右；再看里面有没有 `build/`、`toolchain/` 这些子目录。

**修法**：用 sdkmanager 重装（先装 cmdline-tools 才有 sdkmanager）：

```bash
# cmdline-tools 已装在 ~/Library/Android/sdk/cmdline-tools/latest
sdkmanager --sdk_root=$HOME/Library/Android/sdk "ndk;27.1.12297006"
```

本项目要求的 NDK 版本定义在 `node_modules/react-native/gradle/libs.versions.toml` 的 `ndkVersion`。

## 坑二：CMake 太旧，解析不了新 SDK XML

**现象**：`CXX5304 This version only understands SDK XML versions up to 3 but an SDK XML file of version 4 was encountered`。

**根因**：SDK 里只有 CMake 3.22.1（2022 年的），而新版 SDK 工具写出的 package.xml 是 v4 格式。

**修法**：装新版 CMake 并全局指定，让所有模块（包括把版本钉死在 3.22.1 的 react-native-worklets）都用新版：

```bash
sdkmanager --sdk_root=$HOME/Library/Android/sdk "cmake;3.31.1"
```

然后在 `android/local.properties` 里加（该文件是本机配置，不进 git）：

```properties
sdk.dir=/Users/xuchang09/Library/Android/sdk
cmake.dir=/Users/xuchang09/Library/Android/sdk/cmake/3.31.1
```

## 坑三：JDK 24 太新

**现象**：`configureCMakeDebug` 任务失败，异常信息是 `WARNING: A restricted method in java.lang.System has been called`。

**根因**：系统默认 JDK 是 24（`/usr/libexec/java_home` 可查），React Native 构建链还没跟上。

**修法**：构建时把 `JAVA_HOME` 指向已装的 JDK 17：

```bash
export JAVA_HOME=/Users/xuchang09/Library/Java/JavaVirtualMachines/ms-17.0.16/Contents/Home
```

## 日常构建姿势

```bash
# 编译并安装到模拟器/真机（模拟器先在 Android Studio Device Manager 里启动 Pixel_8）
export JAVA_HOME=/Users/xuchang09/Library/Java/JavaVirtualMachines/ms-17.0.16/Contents/Home
npm run android          # 等价于 npx expo run:android

# 日常 JS 开发（Dev Build 已装好后）
npx expo start --dev-client
```

首次全量编译 15-20 分钟，之后有 Gradle 缓存就快了。

## 查日志的姿势

模拟器 logcat 里 90% 是系统噪音（Google 搜索、SystemUI 钱包卡片等），别裸看。Android Studio Logcat 过滤框用：

```
package:me.xuchang09.alarmclock        # 只看本 App 全量日志
package:me.xuchang09.alarmclock level:error   # 再叠加只看 error
```

本项目包名是 `me.xuchang09.alarmclock`（个人应用，定义在 `app.json` 的 `expo.android.package`）。JS 层的 `console.log` 在 Metro 终端里看更方便。
