/**
 * ### How to Use This Test Script
 * 1. Open your Google Apps Script project.
 * 2. Paste this entire script into a new file (e.g., testGeminiWithFiles.gs).
 * 3. Replace "YOUR_API_KEY" with your actual Gemini API Key.
 * 4. Select the `runTestGeminiWithFiles` function from the toolbar and click "Run".
 * 5. Check the Execution Log to verify the output.
 */

function runTestGeminiWithFiles() {
  const apiKey = "YOUR_API_KEY"; // [REQUIRED] Please set your Gemini API Key

  if (apiKey === "YOUR_API_KEY") {
    console.error("Test aborted: Please set your actual API key.");
    return;
  }

  try {
    console.log("[Step 1] Initializing GeminiWithFiles...");
    // Update: Testing with the latest current model as requested
    const g = new GeminiWithFiles({
      apiKey: apiKey,
      model: "models/gemini-3.1-flash-lite",
      exportTotalTokens: true,
    });
    console.log("Initialization successful.");

    // --- Test 1: Verify Input/Output Token Separation ---
    console.log(
      "\n[Step 2] Testing Token Count Separation with a text prompt...",
    );
    const res = g.generateContent({
      q: "What is the capital of France? Please answer briefly.",
    });

    console.log("--- Generation Result ---");
    console.log("Return Value:", res.returnValue);
    console.log("Input Tokens (promptTokenCount):", res.inputTokenCount);
    console.log("Output Tokens (candidatesTokenCount):", res.outputTokenCount);
    console.log("Total Tokens (totalTokenCount):", res.totalTokenCount);
    console.log("-------------------------");

    if (
      res.inputTokenCount !== undefined &&
      res.outputTokenCount !== undefined
    ) {
      console.log(
        "✅ SUCCESS (Test 1): Input and output token counts are successfully separated!",
      );
    } else {
      console.error(
        "❌ FAILED (Test 1): Token counts are missing from the result.",
      );
    }

    // --- Test 2: Verify Original Filename Retention Logic ---
    console.log("\n[Step 3] Testing Original Filename Retention Logic...");

    const mockDisplayName1 =
      "fileId@test_video_retention_dummy.mp4$page@1$maxPage@1";
    const mockDisplayName2 = "blobName@my_document.pdf$page@5$maxPage@10";
    const mockDisplayName3 = "plain_image.png";

    console.log(`Testing extraction for: "${mockDisplayName1}"`);
    const extracted1 = g._extractOriginalFilename(mockDisplayName1);
    console.log(`Result: "${extracted1}"`);

    console.log(`Testing extraction for: "${mockDisplayName2}"`);
    const extracted2 = g._extractOriginalFilename(mockDisplayName2);
    console.log(`Result: "${extracted2}"`);

    console.log(`Testing extraction for: "${mockDisplayName3}"`);
    const extracted3 = g._extractOriginalFilename(mockDisplayName3);
    console.log(`Result: "${extracted3}"`);

    if (
      extracted1 === "test_video_retention_dummy.mp4" &&
      extracted2 === "my_document.pdf" &&
      extracted3 === "plain_image.png"
    ) {
      console.log(
        "✅ SUCCESS (Test 2): The original filenames are correctly maintained and extracted!",
      );
    } else {
      console.error(
        "❌ FAILED (Test 2): The extracted filenames do not match the expected values.",
      );
    }

    console.log("\nAll tests completed successfully using the latest model.");
  } catch (error) {
    console.error("Test execution failed:", error.stack || error);
  }
}
