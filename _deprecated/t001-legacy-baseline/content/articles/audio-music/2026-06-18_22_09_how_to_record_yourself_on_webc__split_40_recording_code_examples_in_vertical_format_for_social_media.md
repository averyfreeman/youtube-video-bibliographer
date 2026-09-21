---
Title: "Recording Code Examples in Vertical Format for Social Media"
Date: "2026-07-04_12_09"
Tags:
  - Audio and Music
Split_From_Line: 40
Category: "Audio and Music"
---
## Recording in Tall Format for YouTube Shorts and TikTok
The standard tall format resolution for YouTube Shorts and TikTok is 1080 x 1920 pixels. This is a vertical 9:16 aspect ratio.

### Technical Specifications
* Standard Resolution: 1080 x 1920 pixels
* Aspect Ratio: 9:16 (Vertical)
* Minimum Resolution: 720 x 1280 pixels (Not recommended for coding videos)
* Maximum Frame Rate: 60 frames per second (fps)

### Tips for Coding Videos in Tall Format
* Keep Code Centered: TikTok and Shorts place user interface overlays (like the like button, description, and sound title) on the bottom and right edges of the screen. Keep your code in the middle 60% of the frame so it does not get covered.
* Aggressive Font Zoom: Because mobile screens are narrow, standard code text will look tiny. Increase your editor's font size drastically—usually 2x or 3x your normal preference—or crop tightly on just a few lines of code.
* Layout Structure: Position your webcam at the very top or bottom of the vertical frame, leaving the center entirely dedicated to your code editor.

## Setting Up Picture-in-Picture on macOS
You can set up picture-in-picture on macOS without installing any extra applications. The secret lies in a hidden menu item inside QuickTime Player that forces your webcam window to hover over your code or desktop while you record.

### How to Set Up Natively (QuickTime Player)
Follow these steps exactly to create a manual Picture-in-Picture layout:

1. Open QuickTime Player on your Mac.
2. Click File in the top menu bar and select New Movie Recording. This will open a window showing your webcam feed.
3. Go to View in the top menu bar and click Float on Top. This forces the webcam window to stay visible, even when you click inside your code editor.
4. Drag the corners of the webcam window to resize it, and position it in a corner of your screen.
5. Go back to File and select New Screen Recording (or use the shortcut Cmd + Shift + 5).
6. Click Record. Because your webcam is floating on top, the screen recorder will capture both your desktop and your face window simultaneously.

### The Modern macOS Alternative: Presenter Overlay
If you are running a modern version of macOS (Sonoma or later) and use video tools like FaceTime, Zoom, or OBS Studio, Apple has a built-in feature called Presenter Overlay.

When you share your screen or capture video, a green camera icon will appear in your Mac’s menu bar. Clicking it allows you to choose Small (which places you in a movable, circular picture-in-picture bubble over your desktop) or Large (which separates you from your desktop entirely using AI background removal).

### Pro-Tips for Coding with QuickTime PiP
* Hide Window Controls: Move your cursor away from the floating webcam window before recording so the gray top bar and close/minimize buttons disappear from your final video.
* No Internal Audio: The built-in QuickTime tool can only record your external microphone. If your coding tutorial requires viewers to hear sound coming directly out of your Mac (like app notifications or system alerts), you will need to switch to OBS Studio.

## Recording Microphone Audio with the Mac Screen Recorder
Yes, the native Mac screen recorder can record your microphone, but you must manually turn it on before you start recording. By default, it is set to None (silent).

### How to Turn On Your Mic in the Mac Screen Recorder
1. Press Cmd + Shift + 5 on your keyboard to open the built-in recording toolbar.
2. Click the Options button on the menu bar that pops up at the bottom of your screen.
3. Under the Microphone section, select your microphone (e.g., Built-in Microphone or your external USB mic).
4. Click Record.

### Important Limitations to Know
* Voice Only: This setting only captures what your physical microphone hears (your voice).
* No System Audio: It cannot capture internal computer sounds natively. For example, if you run a line of code that plays a sound effect, or if you play a video on your Mac, that internal audio will not be recorded cleanly.

## Using a Bluetooth Headset with the Mac Screen Recorder
Yes, it can absolutely use your Bluetooth headset.

### How to Connect and Select It
1. Connect your Bluetooth headset to your Mac via the Bluetooth settings panel.
2. Press Cmd + Shift + 5 to bring up the screen recording toolbar.
3. Click Options.
4. Under the Microphone section, look for the name of your Bluetooth headset and click it.
5. Click Record.

### A Critical Warning for Developers
Bluetooth headsets have a physical limitation when used on computers: they cannot play high-quality audio and record your microphone at the same time.

When your Mac activates the headset's microphone for your recording, the headset will automatically drop into a low-bandwidth Hands-Free or Call mode. This means:
* Your voice recording quality will sound muffled or compressed (like a phone call).
* Any audio you listen to through the headset while recording will sound scratchy and low-quality.

### Pro-Tip for Better Audio
If you want crisp, professional sound for your coding examples, use your Mac’s built-in microphone (or a USB microphone) as the input device in the Options menu, but keep your Bluetooth headset selected as your computer’s audio output to listen to your system.

## Recording a 1080x1920 Window with the Mac Screen Recorder
No, the native macOS screen recorder (Cmd + Shift + 5) does not allow you to input exact pixel dimensions like 1080x1920 for its crop box. You can only drag the selection box manually, which makes it nearly impossible to get a perfect 9:16 vertical ratio.

However, you can easily achieve a perfect 1080x1920 window using a free app or a clever browser trick.

### Option 1: Use a Free App to Force a 1080x1920 Window (Easiest)
Instead of trying to size the recorder, size your code editor window to exactly 1080x1920, and then tell the Mac recorder to record just that window.

Download a free Mac window manager like Rectangle or Magnet.

Alternatively, download Sizer or use a developer tool like Responsively App.

Resize your IDE (like VS Code) to exactly 1080 x 1920.

Press Cmd + Shift + 5.

Click the Record Selected Window icon (the camera icon with a single window outline).

Hover over your perfectly sized code editor and click to start recording.

### Option 2: The Google Chrome DevTools Trick (No Apps Required)
If you are writing web code and want to record a web browser preview at exactly 1080x1920:

Open Google Chrome.

Press Cmd + Option + I to open DevTools.

Click the Toggle Device Toolbar icon (the phone/tablet icon at the top left of DevTools).

At the top of the screen, change "Responsive" to a custom size and type in 1080 and 1920.

Use Cmd + Shift + 5 and choose Record Selected Portion. Snap the recording corners exactly to the edges of that 1080x1920 Chrome viewport.

### Option 3: Switch to OBS Studio (The Professional Way)
If you want to create Shorts or TikToks regularly, the native Mac recorder will frustrate you because it records horizontally if your monitor is horizontal. OBS Studio handles this perfectly:

Open OBS Studio.

Go to Settings > Video.

Change the Base (Canvas) Resolution to 1080x1920.

Change the Output (Scaled) Resolution to 1080x1920.

Your preview screen will instantly turn into a vertical phone screen. You can then drop your code editor inside it and stretch it to fit perfectly.

## Using ffmpeg to Record and Crop Videos
Yes, you can absolutely use ffmpeg. In fact, using ffmpeg is the most powerful and efficient way to handle this workflow on a Mac. It can automatically crop out the black bars from your recorded video in seconds without any quality loss, or it can even handle the entire screen and webcam recording process directly from your terminal.

### Method 1: The Post-Recording Crop (Easiest)
If you already used Cmd + Shift + 5 to record a portion of your screen (with your code editor and floating webcam), you will end up with a wide, horizontal video containing large black bars on the left and right.

You can instantly slice away the black bars and isolate the exact 1080x1920 vertical area using this terminal command:
```bash
ffmpeg -i input.mov -vf "crop=1080:1920:x:y" -c:v libx264 -crf 18 -c:a copy output.mp4
```
### Method 2: Record Screen + Webcam Live to a Vertical File
You can completely skip the Mac screen recorder tool and let ffmpeg grab your screen audio, microphone, and desktop video simultaneously, streaming them directly into a perfect vertical file.

First, find your Mac's internal device IDs by running:
```bash
ffmpeg -f avfoundation -list_devices true -i ""
```
Look at the output numbers for your Screen, your Webcam, and your Bluetooth/Microphone. Then, run this command to record:
```bash
ffmpeg -f avfoundation -framerate 30 -i "[Screen_ID]:[Mic_ID]" \
-f avfoundation -framerate 30 -video_size 1280x720 -i "[Webcam_ID]:none" \
-filter_complex "[0:v]crop=1080:1920:x:y[screen]; [1:v]scale=360:640[cam]; [screen][cam]overlay=0:0" \
-c:v libx264 -pix_fmt yuv420p output.mp4
```
### Two Important Mac Caveats with ffmpeg
* Retina Display Scaling: If you are on a MacBook with a high-resolution Retina display, Mac handles pixels at a 2x scale factor. If you want a 1080x1920 output, your physical crop layout on the screen might actually need to be drawn at 540x960 physical pixels, because ffmpeg reads the raw, unscaled Retina buffer.
* Permissions: The first time you run ffmpeg to record in your Terminal, macOS will pop up security prompts asking for permission to access your Microphone, Camera, and Screen Recording. You must allow these in System Settings > Privacy & Security.

### The Automated "Center-Crop" Command
If you open your code editor, put your floating QuickTime webcam at the top, and position everything right in the horizontal center of your Mac's screen, you can run this exact command:
```bash
ffmpeg -i input.mov -vf "crop=in_h*(9/16):in_h:(in_w-out_w)/2:0" -c:v libx264 -crf 18 -c:a copy output.mp4
```
This automatically looks at your recording's height and calculates a perfect 9:16 vertical rectangle, completely bypassing the Retina 2x scale confusion.

This tells ffmpeg to look at the far left and far right edges of your video, find the exact middle point, and crop a vertical column straight down the center.

This passes your Bluetooth headset or built-in mic audio through instantly without wasting time re-encoding it.

### How to use this workflow flawlessly
* Arrange your vertical code window and floating webcam right in the middle of your Mac's screen.
* Press Cmd + Shift + 5 and record your Entire Screen (this ensures the center math works perfectly).
* Stop recording, open your Terminal, and run the command above.

You will instantly get a vertical file with all the distracting left and right desktop space sliced away, perfectly formatted for mobile feeds.
