/**
 * =========================================================
 * Agent Skills Complete Architecture on Google Apps Script
 * using GeminiWithFiles library
 * =========================================================
 *
 * [Prerequisites]
 * 1. Open Google Apps Script (https://script.new/)
 * 2. Add the updated "GeminiWithFiles" library to this project.
 * 3. Go to Project Settings > Script Properties.
 * 4. Add a property named "GEMINI_API_KEY" with your Gemini API Key.
 *
 * [How to Run]
 * Run the `test2()` function.
 * This function will automatically create temporary skills,
 * run the test cases, and clean up (delete) the skills afterwards.
 */

function test2() {
  const props = PropertiesService.getScriptProperties();
  const apiKey = props.getProperty("GEMINI_API_KEY");

  if (!apiKey) {
    console.error(
      "❌ Error: API Key is missing. Please set GEMINI_API_KEY in Script Properties.",
    );
    return;
  }

  // ==========================================
  // 1. Setup Phase (Create temporary folders/files)
  // ==========================================
  console.log("=== 1. Setup Phase ===");
  const timestamp = new Date().getTime();
  const rootFolderName = `Temp_Gemini_Skills_Root_${timestamp}`;
  const rootFolder = DriveApp.createFolder(rootFolderName);
  const rootId = rootFolder.getId();
  console.log(`Creating temporary skills folder: ${rootFolderName}`);

  try {
    // --- Skill 1: email-drafter ---
    const skill1Folder = rootFolder.createFolder("email-drafter");
    const skill1Md = `---
name: email-drafter
description: A specialized skill for drafting polite business emails and applying standard templates.
---
You are a business email expert. Follow these steps:
1. Use "read_skill_resource" to read "business_template.txt" to check its structure.
2. Fill in the brackets [ ] in the template with user's information.
3. Output the final draft in highly polite English.`;
    skill1Folder.createFile("SKILL.md", skill1Md);
    skill1Folder.createFile(
      "business_template.txt",
      "Subject: [Subject]\n\nDear [Name],\n\nI hope this email finds you well.\n\n[Body]\n\nBest regards,\n[Your Name/Company]",
    );

    // --- Skill 2: json-translator ---
    const skill2Folder = rootFolder.createFolder("json-translator");
    const skill2Md = `---
name: json-translator
description: A specialized skill to translate input text into a specified language and output strictly in a predefined JSON format.
---
You are an excellent translation agent. Follow these steps:
1. Use "read_skill_resource" to read "format.json".
2. Translate the user's input text into the target language.
3. Output strictly in JSON format according to the template.`;
    skill2Folder.createFile("SKILL.md", skill2Md);
    skill2Folder.createFile(
      "format.json",
      `{\n  "original_text": "[Original]",\n  "target_language": "[Target Language]",\n  "translated_text": "[Translated]"\n}`,
    );

    // --- Skill 3: workspace-automator (Advanced Dynamic Scripting) ---
    const skill3Folder = rootFolder.createFolder("workspace-automator");
    const skill3Md = `---
name: workspace-automator
description: A powerful skill to automatically generate Google Sheets and Google Docs using dynamic GAS scripts.
---
You are a Google Workspace Automation Agent. You MUST use the "run_dynamic_script" tool to execute the provided scripts.

Available Scripts:
1. "sampleScript1.js": Creates a Google Sheet. 
   - Required argsJSON: {"title": "Sheet Name", "data": [["Col1", "Col2"], ["Val1", "Val2"]]}
2. "sampleScript2.js": Creates a Google Doc.
   - Required argsJSON: {"title": "Doc Title", "content": "The body paragraph..."}

Instructions: Analyze the request, prepare the JSON arguments, execute the script(s), and return the generated URLs.`;
    skill3Folder.createFile("SKILL.md", skill3Md);

    skill3Folder.createFile(
      "sampleScript1.js",
      `
      const title = args.title || "Generated Sheet";
      const data = args.data || [["Empty"]];
      const ss = SpreadsheetApp.create(title);
      const sheet = ss.getActiveSheet();
      sheet.getRange(1, 1, data.length, data[0].length).setValues(data);
      sheet.getRange(1, 1, 1, data[0].length).setFontWeight("bold").setBackground("#d9ead3");
      return "Spreadsheet created! URL: " + ss.getUrl();
    `,
    );

    skill3Folder.createFile(
      "sampleScript2.js",
      `
      const title = args.title || "Generated Doc";
      const content = args.content || "No content.";
      const doc = DocumentApp.create(title);
      const body = doc.getBody();
      body.insertParagraph(0, title).setHeading(DocumentApp.ParagraphHeading.HEADING1);
      body.appendParagraph(content);
      return "Document created! URL: " + doc.getUrl();
    `,
    );

    console.log("✅ Setup completed! 3 temporary skills created.");
    CacheService.getScriptCache().remove(`agent_skills_${rootId}`);

    // ==========================================
    // 2. Execution Phase (Run Test Cases)
    // ==========================================
    console.log("\n=== 2. Execution Phase ===");

    // Initialize the Agent using GeminiWithFiles
    const agent = GeminiWithFiles.geminiWithFiles({
      apiKey: apiKey,
      skillFolderId: rootId,
      model: "models/gemini-3-flash-preview", // Can be adjusted as needed
      temperature: 0.0, // Set to 0.0 for stable function calling behavior
    });

    const testCases = [
      "[Basic Skill] Create an email draft to Alice reporting the Q3 server migration progress.",
      "[Basic Skill] Translate 'Autonomous agents will revolutionize productivity.' into Japanese.",
      "[Advanced Skill] Create a Google Sheet named 'Q3 Sales Forecast' with rows:['Month', 'Sales'], ['July', 5000], ['August', 7200]. Also, create a Google Doc summarizing this success.",
    ];

    for (let i = 0; i < testCases.length; i++) {
      console.log(`\n--------------------------------------------------`);
      console.log(`🚀 Test Case ${i + 1}: ${testCases[i]}`);
      console.log(`--------------------------------------------------`);

      // Clear the agent history for each test case to keep context independent
      agent.history = [];

      // Execute chat
      const result = agent.chat({ q: testCases[i] });

      // Extract activated skills from the history array to display them
      const history = agent.history;
      const activatedSkills = history
        .flatMap((h) => h.parts || [])
        .filter(
          (p) => p.functionCall && p.functionCall.name === "activate_skill",
        )
        .map((p) => p.functionCall.args.skillName);
      const uniqueSkills = [...new Set(activatedSkills)];

      console.log(`\n--- ✨ Final Output ---`);
      console.log(
        `🛠️ Skills Used: ${uniqueSkills.length > 0 ? uniqueSkills.join(", ") : "None"}`,
      );

      // Extract the final text output from the response
      let outputText = "";
      if (
        result &&
        result.candidates &&
        result.candidates[0] &&
        result.candidates[0].content &&
        result.candidates[0].content.parts
      ) {
        const textParts = result.candidates[0].content.parts.filter(
          (p) => p.text,
        );
        outputText = textParts.map((p) => p.text).join("\n");
      }

      console.log(`\n${outputText}`);
    }
  } catch (error) {
    console.error(`❌ Execution Error: ${error.message}`);
  } finally {
    // ==========================================
    // 3. Cleanup Phase (Delete temporary resources)
    // ==========================================
    console.log("\n=== 3. Cleanup Phase ===");
    rootFolder.setTrashed(true); // Move the temporary folder to trash
    CacheService.getScriptCache().remove(`agent_skills_${rootId}`); // Clear the script cache
    console.log(
      `✅ Cleanup completed. The temporary folder '${rootFolderName}' has been moved to the trash.`,
    );
  }
}
