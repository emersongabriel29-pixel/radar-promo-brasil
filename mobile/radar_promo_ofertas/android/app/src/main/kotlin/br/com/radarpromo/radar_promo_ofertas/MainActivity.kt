package br.com.radarpromo.radar_promo_ofertas

import io.flutter.embedding.android.FlutterActivity
import io.flutter.embedding.engine.FlutterEngine
import io.flutter.plugin.common.MethodChannel
import android.os.Build
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.Notification
import android.content.Context
import android.Manifest
import android.content.pm.PackageManager

class MainActivity : FlutterActivity() {
    @Suppress("DEPRECATION")
    override fun configureFlutterEngine(flutterEngine: FlutterEngine) {
        super.configureFlutterEngine(flutterEngine)
        MethodChannel(flutterEngine.dartExecutor.binaryMessenger, "br.com.radarpromo/app_info")
            .setMethodCallHandler { call, result ->
                if (call.method != "getVersion") {
                    result.notImplemented()
                } else {
                    try {
                        val info = packageManager.getPackageInfo(packageName, 0)
                        val code = if (Build.VERSION.SDK_INT >= 28) info.longVersionCode else info.versionCode.toLong()
                        result.success(mapOf("version" to (info.versionName ?: ""), "build" to code.toString()))
                    } catch (_: Exception) {
                        result.error("APP_INFO_UNAVAILABLE", "Versão indisponível", null)
                    }
                }
            }
        MethodChannel(flutterEngine.dartExecutor.binaryMessenger, "br.com.radarpromo/notifications")
            .setMethodCallHandler { call, result ->
                when (call.method) {
                    "showPriceAlert" -> {
                        val title = call.argument<String>("title")?.take(100)
                        val body = call.argument<String>("body")?.take(200)
                        if (title.isNullOrBlank() || body.isNullOrBlank()) {
                            result.error("INVALID_ALERT", "Título ou mensagem inválida", null)
                        } else if (Build.VERSION.SDK_INT >= 33 &&
                            checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
                            result.success(false)
                        } else {
                            try {
                                val manager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
                                val channelId = "price_alerts"
                                if (Build.VERSION.SDK_INT >= 26) {
                                    manager.createNotificationChannel(NotificationChannel(
                                        channelId, "Alertas de preço", NotificationManager.IMPORTANCE_DEFAULT))
                                }
                                val builder = if (Build.VERSION.SDK_INT >= 26)
                                    Notification.Builder(this, channelId) else Notification.Builder(this)
                                val notification = builder
                                    .setSmallIcon(applicationInfo.icon)
                                    .setContentTitle(title)
                                    .setContentText(body)
                                    .setAutoCancel(true)
                                    .build()
                                manager.notify((title + body).hashCode(), notification)
                                result.success(true)
                            } catch (_: Exception) {
                                result.error("NOTIFICATION_FAILED", "Não foi possível exibir o alerta", null)
                            }
                        }
                    }
                    else -> result.notImplemented()
                }
            }
    }
}
