# Protocol Logos

## BonkBot Logo Setup

To add the BonkBot logo:

1. Go to https://x.com/bonkbot_io
2. Right-click on their profile picture/avatar
3. Save the image as `bonkbot-logo.png` in this directory
4. The app will automatically use the new logo

The logo should be:
- Square format (1:1 aspect ratio)
- Minimum 64x64 pixels
- PNG format for transparency support
- Clear and recognizable at small sizes

## Current Setup

The BonkBot configuration in `src/lib/protocol-config.ts` now uses a custom `BonkBotIcon` component that will:
- Display the actual logo when `bonkbot-logo.png` is present
- Fall back to a generic bot icon if the logo file is missing