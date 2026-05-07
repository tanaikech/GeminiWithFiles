/**
 * =========================================================
 * Agent Skills Complete Architecture on Google Apps Script
 * using GeminiWithFiles library (Including Orchestration)
 * =========================================================
 *
 * [Prerequisites]
 * 1. Open Google Apps Script (https://script.new/)
 * 2. Add the updated "GeminiWithFiles" library to this project.
 * 3. Go to Project Settings > Script Properties.
 * 4. Add a property named "GEMINI_API_KEY" with your Gemini API Key.
 *
 * [How to Run]
 * Run the `test3()` function.
 * This function will automatically create temporary skills (including subagents),
 * run the test cases, and clean up (delete) the skills afterwards.
 */

function test3() {
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
    // --- Skill 1: email-drafter (Basic Resource Reading) ---
    const emailFolder = rootFolder.createFolder("email-drafter");
    const emailMd = `---
name: email-drafter
description: Expert in drafting business emails using standard templates.
---
Instructions:
1. Use "read_skill_resource" to read "business_template.txt".
2. Fill the template placeholders [Subject], [Name], [Body] with user details.
3. Return the polished final draft.`;
    emailFolder.createFile("SKILL.md", emailMd);
    emailFolder.createFile(
      "business_template.txt",
      "Subject: [Subject]\n\nDear [Name],\n\n[Body]\n\nBest regards,\n[Your Name]",
    );

    // --- Skill 2: json-translator (JSON Output Formatting) ---
    const jsonFolder = rootFolder.createFolder("json-translator");
    const jsonMd = `---
name: json-translator
description: Translates text into specific languages in strict JSON format.
---
Instructions:
1. Use "read_skill_resource" to get "format.json".
2. Translate the input and populate the JSON fields. Output ONLY valid JSON.`;
    jsonFolder.createFile("SKILL.md", jsonMd);
    jsonFolder.createFile(
      "format.json",
      `{\n "status": "success",\n "translated_text": "[Result]"\n}`,
    );

    // --- Skill 3: workspace-automator (Dynamic Script Execution) ---
    const autoFolder = rootFolder.createFolder("workspace-automator");
    const autoMd = `---
name: workspace-automator
description: Automates Spreadsheet creation via run_dynamic_script.
---
Instructions:
1. Prepare argsJSON for "sheetCreator.js".
2. Use "run_dynamic_script" to execute the automation. Return the generated URLs.`;
    autoFolder.createFile("SKILL.md", autoMd);
    autoFolder.createFile(
      "sheetCreator.js",
      `
      const ss = SpreadsheetApp.create(args.title || "Auto Sheet");
      return "Sheet Created: " + ss.getUrl();
      `,
    );

    // --- Skill 4: code-reviewer (Subagent / Specialized Expert) ---
    const reviewerFolder = rootFolder.createFolder("code-reviewer");
    const reviewerMd = `---
name: code-reviewer
description: Security expert that reviews code snippets for vulnerabilities.
---
Instructions:
Act as a Senior Security Auditor. 
1. Analyze the provided code for hardcoded secrets, injection risks, or bad patterns.
2. Provide a point-by-point security report.`;
    reviewerFolder.createFile("SKILL.md", reviewerMd);

    // --- Skill 5: lead-developer (Orchestrator / Parent Agent) ---
    const leadFolder = rootFolder.createFolder("lead-developer");
    const leadMd = `---
name: lead-developer
description: Manages code development and delegates reviews to the code-reviewer subagent.
---
Instructions:
You are the Lead Developer.
1. When asked to evaluate code, FIRST use "invoke_agent" to call "code-reviewer" and pass the code.
2. Combine the reviewer's report with your own architectural advice for the final response.`;
    leadFolder.createFile("SKILL.md", leadMd);

    console.log(
      "✅ Setup completed! 5 temporary skills (including subagents) created.",
    );
    CacheService.getScriptCache().remove(`agent_skills_${rootId}`);

    // ==========================================
    // 2. Execution Phase (Run Test Cases)
    // ==========================================
    console.log("\n=== 2. Execution Phase ===");

    // Initialize the Agent using GeminiWithFiles
    // Note: If using as a library, `GeminiWithFiles.geminiWithFiles()` is used.
    // If this test script is inside the library project itself, `geminiWithFiles()` is used directly.
    const initAgentParams = {
      apiKey: apiKey,
      skillFolderId: rootId,
      model: "models/gemini-3-flash-preview",
      temperature: 0.0,
      propertiesService: props,
    };
    const agent =
      typeof GeminiWithFiles !== "undefined" && GeminiWithFiles.geminiWithFiles
        ? GeminiWithFiles.geminiWithFiles(initAgentParams)
        : geminiWithFiles(initAgentParams);

    const testCases = [
      {
        type: "Basic Skill",
        text: "Draft an email to Bob about the server maintenance on Friday.",
      },
      {
        type: "Dynamic Scripting",
        text: "Create a Google Sheet titled 'Project X Roadmap'.",
      },
      {
        type: "Orchestration",
        text: "Lead Developer, please check this function: 'function auth(pw) { return pw == \"admin123\"; }'",
      },
    ];

    for (let i = 0; i < testCases.length; i++) {
      console.log(`\n--------------------------------------------------`);
      console.log(`🚀 Test Case ${i + 1} [${testCases[i].type}]`);
      console.log(`INPUT: ${testCases[i].text}`);
      console.log(`--------------------------------------------------`);

      // Clear the agent history for each test case to keep context independent
      agent.history = [];

      // Execute chat
      const result = agent.chat({ q: testCases[i].text });

      // Extract activated skills and invoked agents from the history array to display them
      const history = agent.history;

      const activatedSkills = history
        .flatMap((h) => h.parts || [])
        .filter(
          (p) => p.functionCall && p.functionCall.name === "activate_skill",
        )
        .map((p) => p.functionCall.args.skillName);

      const invokedAgents = history
        .flatMap((h) => h.parts || [])
        .filter((p) => p.functionCall && p.functionCall.name === "invoke_agent")
        .map((p) => p.functionCall.args.agent_name);

      const uniqueSkills = [...new Set([...activatedSkills, ...invokedAgents])];

      console.log(`\n--- ✨ Final Output ---`);
      console.log(
        `🛠️ Skills/Subagents Used: ${uniqueSkills.length > 0 ? uniqueSkills.join(", ") : "None"}`,
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
      } else if (typeof result === "string") {
        outputText = result;
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
    if (rootFolder) {
      rootFolder.setTrashed(true); // Move the temporary folder to trash
      console.log(
        `✅ Cleanup completed. The temporary folder '${rootFolderName}' has been moved to the trash.`,
      );
    }
    CacheService.getScriptCache().remove(`agent_skills_${rootId}`); // Clear the script cache
  }
}
