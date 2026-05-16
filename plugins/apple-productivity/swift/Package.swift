// swift-tools-version: 6.0
import PackageDescription

let package = Package(
  name: "AppleProductivityHelper",
  platforms: [.macOS(.v14)],
  products: [
    .executable(name: "apple-productivity-helper", targets: ["AppleProductivityHelper"])
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
      name: "AppleProductivityHelper",
      dependencies: ["MailScripting"],
      linkerSettings: [
        .linkedFramework("ScriptingBridge")
      ]
    )
  ]
)
