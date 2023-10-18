import UIKit
import Capacitor

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate {

    var window: UIWindow?

    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        // common controllers
        let root = window?.rootViewController
        let rootView = root?.view
        
        // MARK: Capacitor enhancements on WebView
        
        // set background to black to retain visual consistancy
        rootView?.backgroundColor = UIColor.black
        
        // enable bounces since Capacitor seems to disabled it
        rootView?.scrollView.bounces = true
        
        // disable pinch gesture
        rootView?.scrollView.pinchGestureRecognizer?.isEnabled = false
        
        if let options = launchOptions {
            let notif = options[UIApplication.LaunchOptionsKey.remoteNotification] as? [NSDictionary]
            print("remote notification launch option", notif ?? "null")
        }
        
        var blurStyle = UIBlurEffect.Style.dark
        
        if #available(iOS 13.0, *) {
            blurStyle = UIBlurEffect.Style.systemMaterial
        }
        
        let blurEffect = UIBlurEffect(style: blurStyle)

        let blurEffectView = UIVisualEffectView(effect: blurEffect)
        blurEffectView.translatesAutoresizingMaskIntoConstraints = false
        rootView?.addSubview(blurEffectView)

        guard let leadingAnchor = rootView?.leadingAnchor,
              let widthAnchor   = rootView?.widthAnchor,
              let topAnchor     = rootView?.topAnchor,
              let bottomAnchor  = rootView?.safeAreaLayoutGuide.topAnchor
        else {
            return true
        }

        blurEffectView.leadingAnchor.constraint(equalTo: leadingAnchor).isActive = true
        blurEffectView.widthAnchor.constraint(equalTo: widthAnchor).isActive = true
        blurEffectView.topAnchor.constraint(equalTo: topAnchor).isActive = true
        blurEffectView.bottomAnchor.constraint(equalTo: bottomAnchor).isActive = true
        // Override point for customization after application launch.
        return true
    }

    func applicationWillResignActive(_ application: UIApplication) {
        // Sent when the application is about to move from active to inactive state. This can occur for certain types of temporary interruptions (such as an incoming phone call or SMS message) or when the user quits the application and it begins the transition to the background state.
        // Use this method to pause ongoing tasks, disable timers, and invalidate graphics rendering callbacks. Games should use this method to pause the game.
    }

    func applicationDidEnterBackground(_ application: UIApplication) {
        // Use this method to release shared resources, save user data, invalidate timers, and store enough application state information to restore your application to its current state in case it is terminated later.
        // If your application supports background execution, this method is called instead of applicationWillTerminate: when the user quits.
    }

    func applicationWillEnterForeground(_ application: UIApplication) {
        // Called as part of the transition from the background to the active state; here you can undo many of the changes made on entering the background.
    }

    func applicationDidBecomeActive(_ application: UIApplication) {
        // Restart any tasks that were paused (or not yet started) while the application was inactive. If the application was previously in the background, optionally refresh the user interface.
    }

    func applicationWillTerminate(_ application: UIApplication) {
        // Called when the application is about to terminate. Save data if appropriate. See also applicationDidEnterBackground:.
    }

    func application(_ app: UIApplication, open url: URL, options: [UIApplication.OpenURLOptionsKey: Any] = [:]) -> Bool {
        // Called when the app was launched with a url. Feel free to add additional processing here,
        // but if you want the App API to support tracking app url opens, make sure to keep this call
        return ApplicationDelegateProxy.shared.application(app, open: url, options: options)
    }

    func application(_ application: UIApplication, continue userActivity: NSUserActivity, restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void) -> Bool {
        // Called when the app was launched with an activity, including Universal Links.
        // Feel free to add additional processing here, but if you want the App API to support
        // tracking app url opens, make sure to keep this call
        return ApplicationDelegateProxy.shared.application(application, continue: userActivity, restorationHandler: restorationHandler)
    }

}
