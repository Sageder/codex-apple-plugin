// swift-tools-version: 6.0
import PackageDescription

let package = Package(
  name: "AppleMailHelper",
  platforms: [.macOS(.v14)],
  products: [
    .executable(name: "apple-mail-helper", targets: ["AppleMailHelper"])
  ],
  targets: [
    .target(
      name: "MailScripting",
      publicHeadersPath: "include",
      linkerSettings: [
        .linkedFramework("ScriptingBridge"),
        .linkedFramework("AppKit")
      ]
    ),
    .executableTarget(
      name: "AppleMailHelper",
      dependencies: ["MailScripting"],
      linkerSettings: [
        .linkedFramework("ScriptingBridge")
      ]
    )
  ]
)
