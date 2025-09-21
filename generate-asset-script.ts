/*
IMPORTANT NOTICE: DO NOT REMOVE
This is a script that generates an image and saves it to the assets folder. 
You should not use this script unless the user EXPLICITLY asks you to generate an asset.
DO NOT PROACTIVELY GENERATE ASSETS FOR THE USER.

You will need to update the prompt and the options (2nd parameter of the generateImage function) depending on your use case.
options: {
  size?: "1024x1024" | "1536x1024" | "1024x1536" | "auto";
  quality?: "low" | "medium" | "high" | "auto";
  format?: "png" | "jpeg" | "webp";
  background?: undefined | "transparent";
}

If you need to generate many assets, REFACTOR THIS SCRIPT TO CONCURRENTLY GENERATE UP TO 3 ASSETS AT A TIME. If you do not, the bash tool may time out.
use npx tsx generate-asset-script.ts to run this script.
*/

import { generateImage } from "./src/api/image-generation";
import * as fs from "fs";
import * as path from "path";
import { Readable } from "stream";
import { finished } from "stream/promises";

async function downloadImage(url: string, outputPath: string): Promise<void> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download image: ${response.status} ${response.statusText}`);
  }

  const fileStream = fs.createWriteStream(outputPath);
  // @ts-ignore - Node.js types are not fully compatible with the fetch API
  await finished(Readable.fromWeb(response.body).pipe(fileStream));
  console.log(`Image downloaded successfully to ${outputPath}`);
}

async function logImageGeneration(prompt: string, imageUrl: string): Promise<void> {
  const logDir = path.join(__dirname, "logs");
  const logFile = path.join(logDir, "imageGenerationsLog");

  // Create logs directory if it doesn't exist
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }

  const logEntry = `[${new Date().toISOString()}] Prompt: "${prompt}"\nImage URL: ${imageUrl}\n\n`;
  fs.appendFileSync(logFile, logEntry);
}

async function generateAssets() {
  try {
    // Generate app icon
    const iconPrompt = "Modern, clean grocery app icon with a friendly green color scheme (#48C78E), featuring a simple basket or food-related symbol, minimalist design suitable for iOS app store, white background, centered design";
    
    console.log("Generating app icon with prompt:", iconPrompt);
    const iconUrl = await generateImage(iconPrompt, {
      size: "1024x1024",
      quality: "high",
      format: "png",
    });

    await logImageGeneration(iconPrompt, iconUrl);
    const iconPath = path.join(__dirname, "assets", "icon.png");
    await downloadImage(iconUrl, iconPath);
    console.log("App icon saved to:", iconPath);

    // Generate splash screen
    const splashPrompt = "Clean splash screen for Nibble grocery app, featuring the app logo on a solid green background (#48C78E), minimalist design, centered logo, mobile app splash screen format";
    
    console.log("Generating splash screen with prompt:", splashPrompt);
    const splashUrl = await generateImage(splashPrompt, {
      size: "1536x1024",
      quality: "high",
      format: "png",
    });

    await logImageGeneration(splashPrompt, splashUrl);
    const splashPath = path.join(__dirname, "assets", "splash.png");
    await downloadImage(splashUrl, splashPath);
    console.log("Splash screen saved to:", splashPath);

    console.log("All assets generated successfully!");
    
  } catch (error) {
    console.error("Error generating assets:", error);
  }
}

async function main() {
  await generateAssets();
}

main();
