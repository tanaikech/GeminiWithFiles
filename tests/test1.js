/**
 * =========================================================
 * Comprehensive Test Suite for GeminiWithFiles
 * =========================================================
 *
 * ### Description
 * This function runs a series of tests to demonstrate and verify the core functionalities
 * of the GeminiWithFiles library. It systematically executes the following tests:
 * 1. Simple Text Generation
 * 2. Structured Output using JSON Schema
 * 3. Uploading a Blob and Generating Content
 * 4. Cleaning up Uploaded Files
 * 5. Counting Tokens
 * 6. System Instruction
 * 7. Chat Method (Multi-turn conversation)
 * 8. Code Execution
 * 9. Google Search for Grounding
 * 10. Agent Skills (Dynamic folder setup, autonomous tool usage, and cleanup)
 *
 * [Prerequisites]
 * 1. Open Google Apps Script (https://script.new/).
 * 2. Add the "GeminiWithFiles" library to this project.
 * 3. Go to Project Settings > Script Properties.
 * 4. Add a property named "GEMINI_API_KEY" with your Gemini API Key.
 *
 * [How to Run]
 * Simply execute the `test1()` function.
 * Note: Test 10 (Agent Skills) will create temporary folders and files in your Google Drive,
 * which are automatically moved to the trash at the end of the test.
 */
function test1() {
  const props = PropertiesService.getScriptProperties();
  const apiKey = props.getProperty("GEMINI_API_KEY");

  if (!apiKey) {
    console.error(
      "❌ Error: API Key is missing. Please set GEMINI_API_KEY in Script Properties.",
    );
    return;
  }

  console.log("=== Starting GeminiWithFiles Tests ===");

  try {
    // --------------------------------------------------
    // Test 1: Simple Text Generation
    // --------------------------------------------------
    console.log("\n--- Test 1: Simple Text Generation ---");
    const gText = GeminiWithFiles.geminiWithFiles({ apiKey: apiKey });
    const resText = gText.generateContent({
      q: "Explain 'Google Apps Script' within 15 words.",
    });
    console.log("Result 1:", resText);

    // --------------------------------------------------
    // Test 2: Structured Output using JSON Schema
    // --------------------------------------------------
    console.log("\n--- Test 2: Structured Output using JSON Schema ---");
    const gJson = GeminiWithFiles.geminiWithFiles({
      apiKey: apiKey,
      response_mime_type: "application/json",
    });

    // Define a schema to return an array of JSON objects containing fruit names and colors.
    const jsonSchema = {
      type: "array",
      items: {
        type: "object",
        properties: {
          fruit: {
            type: "string",
            description: "Name of the fruit (e.g., Apple)",
          },
          color: {
            type: "string",
            description: "Color of the fruit (e.g., Red)",
          },
        },
      },
    };

    // Passing only the schema will internally process it as a prompt.
    const resJson = gJson.generateContent({ jsonSchema: jsonSchema });
    console.log("Result 2:", resJson);

    // --------------------------------------------------
    // Test 3: Uploading a Blob and Generating Content
    // --------------------------------------------------
    console.log("\n--- Test 3: Uploading a Blob and Generating Content ---");
    const gFile = GeminiWithFiles.geminiWithFiles({ apiKey: apiKey });

    // Automatically generate test text data (Blob) within the program.
    const dummyText =
      "This is a secret document for testing. The password is 'Gemini is awesome'.";
    const blob = Utilities.newBlob(
      dummyText,
      "text/plain",
      "secret_document.txt",
    );

    console.log("Uploading file to Gemini...");
    const fileList = gFile.setBlobs([blob]).uploadFiles();
    console.log(
      "Upload completed:",
      fileList.map((f) => f.displayName),
    );

    console.log("Asking a question about the uploaded file...");
    const resFile = gFile
      .withUploadedFilesByGenerateContent(fileList)
      .generateContent({ q: "What is the password written in this document?" });
    console.log("Result 3:", resFile);

    // --------------------------------------------------
    // Test 4: Cleaning up Uploaded Files
    // --------------------------------------------------
    console.log("\n--- Test 4: Cleaning up Uploaded Files ---");
    // Deletion requires the 'name' (resource name of the file).
    const fileNames = fileList.map((f) => f.name);
    if (fileNames.length > 0) {
      gFile.deleteFiles(fileNames);
      console.log("Deleted files:", fileNames);
    }

    // --------------------------------------------------
    // Test 5: Counting Tokens
    // --------------------------------------------------
    console.log("\n--- Test 5: Counting Tokens ---");
    const tokenObj = {
      contents: [{ parts: [{ text: "What is Google Apps Script?" }] }],
    };
    const resToken = gText.countTokens(tokenObj);
    console.log("Result 5 (Token Count):", resToken);

    // --------------------------------------------------
    // Test 6: System Instruction
    // --------------------------------------------------
    console.log("\n--- Test 6: System Instruction ---");
    const gSystem = GeminiWithFiles.geminiWithFiles({
      apiKey: apiKey,
      systemInstruction: {
        parts: [
          {
            text: "You are a cat. Your name is Neko. You always end your sentences with 'meow'.",
          },
        ],
      },
    });
    const resSystem = gSystem.generateContent({ q: "What is your name?" });
    console.log("Result 6:", resSystem);

    // --------------------------------------------------
    // Test 7: Chat Method
    // --------------------------------------------------
    console.log("\n--- Test 7: Chat Method ---");
    const gChat = GeminiWithFiles.geminiWithFiles({ apiKey: apiKey });
    console.log("Sending first message...");
    const resChat1 = gChat.chat({
      parts: [{ text: "Hi, I am Bob." }],
      role: "user",
    });

    console.log("Sending second message...");
    // Check if it remembers the previous context (that the name is Bob).
    const resChat2 = gChat.chat({
      parts: [{ text: "Do you remember my name?" }],
      role: "user",
    });
    console.log(
      "Result 7 (Chat Response):",
      resChat2.candidates[0].content.parts[0].text,
    );

    // --------------------------------------------------
    // Test 8: Code Execution
    // --------------------------------------------------
    console.log("\n--- Test 8: Code Execution ---");
    // Set exportRawData to true to retrieve the entire Code Execution result.
    const gCode = GeminiWithFiles.geminiWithFiles({
      apiKey: apiKey,
      tools: [{ codeExecution: {} }],
      exportRawData: true,
    });
    const resCode = gCode.generateContent({
      q: "What is the sum of the first 10 prime numbers? Generate and run code for the calculation.",
    });
    console.log(
      "Result 8 (Code Execution Parts):",
      JSON.stringify(resCode.candidates[0].content.parts, null, 2),
    );

    // --------------------------------------------------
    // Test 9: Google Search for Grounding
    // --------------------------------------------------
    console.log("\n--- Test 9: Google Search for Grounding ---");
    // Set exportRawData to true to check the grounding metadata from Google Search.
    const gSearch = GeminiWithFiles.geminiWithFiles({
      apiKey: apiKey,
      tools: [{ googleSearch: {} }],
      exportRawData: true,
    });
    const resSearch = gSearch.generateContent({
      q: "Who is the current prime minister of Japan?",
    });

    // Output the grounding source data (metadata).
    if (resSearch.candidates[0].groundingMetadata) {
      console.log(
        "Result 9 (Grounding Metadata):",
        JSON.stringify(resSearch.candidates[0].groundingMetadata, null, 2),
      );
    }
    console.log(
      "Result 9 (Text):",
      resSearch.candidates[0].content.parts[0].text,
    );

    // --------------------------------------------------
    // Test 10: Agent Skills (Must be the last test)
    // --------------------------------------------------
    console.log("\n--- Test 10: Agent Skills ---");

    // Create a temporary skill folder on Google Drive.
    const testSkillFolder = DriveApp.createFolder(
      "Test_Gemini_Skills_" + Date.now(),
    );
    const skill1Folder = testSkillFolder.createFolder("greeting-skill");

    // Create SKILL.md (metadata and instructions).
    const skillMd = `---
name: greeting-skill
description: Reads a greeting template and outputs a special greeting to the user. Use this whenever a greeting is requested.
---
You are a greeting expert.
1. Use the "read_skill_resource" tool to read "greeting.txt".
2. Output a cheerful greeting based on the loaded template.`;
    skill1Folder.createFile("SKILL.md", skillMd);

    // Create a resource file (file to be read).
    skill1Folder.createFile(
      "greeting.txt",
      "Hello! Today is a great day! This is a greeting from the Gemini Agent!",
    );

    const skillFolderId = testSkillFolder.getId();
    console.log(`Created a test skill folder (ID: ${skillFolderId})`);

    // Initialize by specifying the skillFolderId.
    const gSkills = GeminiWithFiles.geminiWithFiles({
      apiKey: apiKey,
      skillFolderId: skillFolderId,
    });

    console.log("Running inference using Agent Skills...");
    console.log(
      "* The agent will autonomously call 'activate_skill' and 'read_skill_resource'.",
    );

    const resSkills = gSkills.generateContent({
      q: "Hello! Please give me a greeting.",
    });
    console.log("Result 10 (Agent Skills Response):", resSkills);

    // Delete the temporary folder after the test (move to trash).
    testSkillFolder.setTrashed(true);
    console.log("Moved the test skill folder to the trash.");

    console.log("\n=== All tests completed successfully ===");
  } catch (error) {
    // Catch and log any errors that occur during the test.
    console.error(
      "An error occurred during testing:",
      error.stack || error.message,
    );
  }
}
