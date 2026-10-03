import AppKit

// 用法: swift render-svg.swift <input.svg> <output.png> <size>
let args = CommandLine.arguments
guard args.count >= 4, let size = Int(args[3]) else {
    FileHandle.standardError.write("usage: render-svg.swift <in.svg> <out.png> <size>\n".data(using: .utf8)!)
    exit(1)
}

guard let image = NSImage(contentsOfFile: args[1]) else {
    FileHandle.standardError.write("failed to load \(args[1])\n".data(using: .utf8)!)
    exit(1)
}

guard let rep = NSBitmapImageRep(
    bitmapDataPlanes: nil,
    pixelsWide: size,
    pixelsHigh: size,
    bitsPerSample: 8,
    samplesPerPixel: 4,
    hasAlpha: true,
    isPlanar: false,
    colorSpaceName: .deviceRGB,
    bytesPerRow: 0,
    bitsPerPixel: 0
) else {
    FileHandle.standardError.write("failed to create bitmap rep\n".data(using: .utf8)!)
    exit(1)
}
rep.size = NSSize(width: size, height: size)

NSGraphicsContext.saveGraphicsState()
NSGraphicsContext.current = NSGraphicsContext(bitmapImageRep: rep)
image.draw(
    in: NSRect(x: 0, y: 0, width: size, height: size),
    from: NSRect(x: 0, y: 0, width: image.size.width, height: image.size.height),
    operation: .copy,
    fraction: 1.0
)
NSGraphicsContext.restoreGraphicsState()

guard let data = rep.representation(using: .png, properties: [:]) else {
    FileHandle.standardError.write("failed to encode png\n".data(using: .utf8)!)
    exit(1)
}
try? data.write(to: URL(fileURLWithPath: args[2]))
print("rendered \(args[2]) (\(size)x\(size))")
