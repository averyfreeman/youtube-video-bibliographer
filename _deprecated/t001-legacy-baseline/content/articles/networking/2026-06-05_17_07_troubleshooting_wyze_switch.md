---
Title: "troubleshooting wyze switch"
Date: "2026-06-05_17_07"
Tags:
  - Networking
Category: "Networking"
Source_Products:
  - AI_Mode
  - Search
---
## Troubleshooting Wyze Switch
To troubleshoot a Wyze Switch, I recommend starting with a hard reset: press and hold the button for 20 seconds until the LED blinks rapidly, then release it. Once the light blinks slowly, you can re-add it in the app. Ensure you are connected to a 2.4 GHz Wi-Fi network, as 5 GHz is not supported.

For a more comprehensive understanding of troubleshooting smart switches, including checking app configurations and power cycling, I suggest watching a quick video on the topic.

The following tailored troubleshooting steps can be used depending on the specific issue:

### 1. The Switch Has No Power / Unresponsive
* Check the Breaker: Ensure the circuit breaker feeding the switch hasn't tripped. If it did, reset it and check for loose connections at the wall plate.
* Firmware/App Issues: If you can't control the switch in the app, confirm your Wyze app is on the latest version via your device's app store.
* Check Wiring: Turn off the power at the breaker and unscrew the wall plate. Ensure the line, load, ground, and neutral wires are securely fastened.

### 2. Switch Fails to Update Firmware
* Reset and Re-pair: Perform the 20-second factory reset, set the switch up as a new device, and then attempt the firmware update again while the device is in this fresh state.
* Router Proximity: If the firmware or network update hangs, try bringing the router closer during the update, or temporarily turn on your smartphone’s mobile hotspot to push the update through.

### 3. Additional Controls (Double/Triple/Long Press) Not Working
* Clear the Rules: If your custom presses or vacation mode rules suddenly fail, delete all existing rules assigned to the switch's additional controls.
* Recreate Rules: Once deleted, turn the features off, wait a moment, and set them up again from scratch in the app.

For more detailed diagnostic guides, I recommend consulting the Wyze Switch Troubleshooting Support Center or browsing the Wyze Forum Support Threads.

If a Wyze Switch is blinking white, it indicates a connectivity issue. This can occur when the switch's internal memory is stuck in a loop trying to force a handshake back to the previous Wi-Fi network. To resolve this issue, follow these steps:

### Step 1: Force a Hardware Factory Reset
* Press and hold the main switch paddle button down firmly for exactly 20 seconds.
* Watch the LED: Ignore the standard blinking. Wait until the LED begins to flash extremely rapidly.
* Release the button. The light will shift to a slow, steady blink, which indicates it has successfully entered Bluetooth pairing mode and forgotten the old network.

### Step 2: Prepare Your Smartphone for Migration
* Switch your phone's Wi-Fi network: Before opening the app, go to your phone’s settings and explicitly connect your phone to the new 2.4 GHz IoT Wi-Fi network.
* Toggle Bluetooth: Turn your phone's Bluetooth off for 5 seconds and turn it back on to clear any cached connection errors.

### Step 3: Re-add via the Wyze App
* Open the Wyze App, tap the + plus sign, and choose Add Device.
* Select Power &amp; Lighting > Wyze Switch.
* Because the switch is now in a slow-blink pairing mode, your phone's Bluetooth will instantly detect it.
* When prompted for network credentials, the app will pass your new IoT Wi-Fi network to the switch.

When setting up the switch, it's essential to consider the network configuration. If your dedicated IoT network is a merged mesh network (sharing the same name as a 5 GHz band), ensure you understand the implications of this setup. Additionally, verify that the switch successfully drops into the slow-blinking pairing state after the 20-second hold, indicating a successful reset.
