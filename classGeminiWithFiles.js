/**
 * GeminiWithFiles
 * Author: Kanshi Tanaike
 * Version: 2.0.29
 * GitHub: https://github.com/tanaikech/GeminiWithFiles
 * @class
 */
var GeminiWithFiles = class GeminiWithFiles {
  constructor(object = {}) {
    const {
      apiKey,
      accessToken,
      model,
      version,
      doCountToken,
      history,
      functions,
      response_mime_type,
      responseMimeType,
      response_schema = null,
      responseSchema = null,
      response_json_schema = null,
      responseJsonSchema = null,
      temperature = null,
      systemInstruction,
      exportTotalTokens,
      exportRawData,
      toolConfig,
      tools,
      propertiesService,
      resumableUploadAsNewUpload = false,
      generationConfig = {},
      skillFolderId,
    } = object;

    this.model = model || "models/gemini-3-flash-preview";
    this.version = version || "v1beta";

    const baseUrl = "https://generativelanguage.googleapis.com";
    this.urlGenerateContent = `${baseUrl}/${this.version}/${this.model}:generateContent`;
    this.urlBatchGenerateContent = `${baseUrl}/${this.version}/${this.model}:batchGenerateContent`;
    this.urlUploadFile = `${baseUrl}/upload/${this.version}/files`;
    this.urlGetFileList = `${baseUrl}/${this.version}/files`;
    this.urlDeleteFile = `${baseUrl}/${this.version}/`;
    this.urlCountToken = `${baseUrl}/${this.version}/${this.model}:countTokens`;

    this.doCountToken = doCountToken || false;
    this.exportTotalTokens = exportTotalTokens || false;
    this.exportRawData = exportRawData || false;

    this.queryParameters = apiKey ? { key: apiKey } : {};
    this.accessToken = accessToken || ScriptApp.getOAuthToken();
    this.headers = { authorization: `Bearer ${this.accessToken}` };

    this.fileIds = [];
    this.asImage = false;
    this.blobs = [];
    this.resumableUploads = [];
    this.fileList = [];

    this.skillFolderId = skillFolderId || null;

    this.response_mime_type = response_mime_type || responseMimeType || "";
    this.response_schema = response_schema || responseSchema || null;
    this.response_json_schema =
      response_json_schema || responseJsonSchema || null;
    this.temperature = temperature ?? null;

    this.functions = functions?.params_ ? functions : {};
    if (this.functions && !this.functions.params_) this.functions.params_ = {};

    if (this.skillFolderId) {
      this.functions.params_.activate_skill = {
        description:
          "Activate a specific skill and get detailed instructions and a list of resources. Call this first if you need a skill for the task.",
        parameters: {
          type: "object",
          properties: { skillName: { type: "string" } },
          required: ["skillName"],
        },
      };
      this.functions.activate_skill = (args) =>
        this._activateSkill(args.skillName);

      this.functions.params_.read_skill_resource = {
        description:
          "Read the contents of a resource file (e.g., template) in a skill.",
        parameters: {
          type: "object",
          properties: {
            skillName: { type: "string" },
            fileName: { type: "string" },
          },
          required: ["skillName", "fileName"],
        },
      };
      this.functions.read_skill_resource = (args) =>
        this._readSkillResource(args.skillName, args.fileName);

      this.functions.params_.run_dynamic_script = {
        description:
          "Executes a dynamic JavaScript file from the skill resources.",
        parameters: {
          type: "object",
          properties: {
            skillName: { type: "string" },
            scriptName: { type: "string" },
            argsJSON: { type: "string" },
          },
          required: ["skillName", "scriptName", "argsJSON"],
        },
      };
      this.functions.run_dynamic_script = (args) =>
        this._runDynamicScript(args.skillName, args.scriptName, args.argsJSON);

      this.functions.params_.invoke_agent = {
        description: "Delegates a sub-task to a specialized subagent.",
        parameters: {
          type: "object",
          properties: {
            agent_name: { type: "string" },
            prompt: { type: "string" },
          },
          required: ["agent_name", "prompt"],
        },
      };
      this.functions.invoke_agent = (args) =>
        this._invokeAgent(args.agent_name, args.prompt);

      let systemInstructionText = "";
      if (systemInstruction) {
        if (typeof systemInstruction === "string") {
          systemInstructionText = systemInstruction + "\n\n";
        } else if (
          systemInstruction.parts &&
          Array.isArray(systemInstruction.parts)
        ) {
          systemInstructionText =
            systemInstruction.parts.map((p) => p.text).join("\n") + "\n\n";
        }
      }

      const skills = this._discoverSkills();
      const skillList = Object.values(skills)
        .map((s) => `- ${s.name}: ${s.description}`)
        .join("\n");
      systemInstructionText += `You are a highly capable AI agent. To solve the user's request, the following skills are available.\n\n[Available Skills]\n${skillList}\n\nCall 'activate_skill' if necessary to reveal detailed instructions for a skill. You can also use 'invoke_agent' to delegate sub-tasks to specialized subagents. Respond directly to the user after using tools.`;

      this.systemInstruction = {
        parts: [{ text: systemInstructionText.trim() }],
      };
    } else {
      this.systemInstruction = systemInstruction || null;
    }

    this.toolConfig = toolConfig ? JSON.parse(JSON.stringify(toolConfig)) : {};
    this.history = history || [];
    this.tools = tools || [];
    this.propertiesService = propertiesService;
    this.resumableUploadAsNewUpload = resumableUploadAsNewUpload;
    this.generationConfig = generationConfig || {};
  }

  setFileIds(fileIds, asImage = false) {
    this.fileIds.push(...fileIds);
    this.asImage = asImage;
    return this;
  }
  setBlobs(blobs) {
    this.blobs.push(...blobs);
    return this;
  }
  setFileIdsOrUrlsWithResumableUpload(array) {
    this.resumableUploads.push(...array);
    return this;
  }

  withUploadedFilesByGenerateContent(fileList = [], retry = 3) {
    if (!fileList.length) throw new Error("Given fileList is empty.");
    const checkState = fileList.filter(({ state }) => state === "PROCESSING");
    if (checkState.length > 0) {
      if (retry > 0) {
        Utilities.sleep(10000);
        const tempSet = new Set(fileList.map(({ name }) => name));
        const tempList = this.getFileList().filter(({ name }) =>
          tempSet.has(name),
        );
        return this.withUploadedFilesByGenerateContent(tempList, retry - 1);
      }
    }
    const obj = new Map();
    for (const e of fileList) {
      let k = e.displayName;
      if (k.startsWith("fileId@")) k = k.split("$")[0].split("@")[1];
      else if (k.startsWith("blobName@")) k = k.split("@")[1];
      if (obj.has(k)) obj.get(k).push(e);
      else obj.set(k, [e]);
    }
    this.fileList = Array.from(obj.values()).map((files) => {
      if (files.length > 0 && files[0].displayName.startsWith("fileId@")) {
        files.sort(
          (a, b) =>
            Number(a.displayName.split("$")[1].split("@")[1]) -
            Number(b.displayName.split("$")[1].split("@")[1]),
        );
      }
      return { files };
    });
    return this;
  }

  uploadFiles(n = 50) {
    if (this.resumableUploads.length > 0)
      return this.resumableUploads.map((e) => this.uploadApp_(e));
    throw new Error("No upload items.");
  }

  getFileList() {
    const fileList = [];
    const q = { ...this.queryParameters, pageSize: 100 };
    let pageToken = "";
    do {
      if (pageToken) q.pageToken = pageToken;
      const url = this.addQueryParameters_(this.urlGetFileList, q);
      const res = this.fetch_({
        url,
        ...(this.queryParameters.key ? {} : { headers: this.headers }),
      });
      const obj = JSON.parse(res.getContentText());
      pageToken = obj.nextPageToken || "";
      if (obj.files && obj.files.length > 0) fileList.push(...obj.files);
    } while (pageToken);
    return fileList;
  }

  deleteFiles(names, n = 50) {
    if (!names.length) return [];
    const requests = names.map((name) => ({
      url:
        `${this.urlDeleteFile}${name}` +
        (this.queryParameters.key ? `?key=${this.queryParameters.key}` : ""),
      method: "delete",
      ...(this.queryParameters.key ? {} : { headers: this.headers }),
      muteHttpExceptions: true,
    }));
    const results = [];
    for (let i = 0; i < Math.ceil(requests.length / n); i++) {
      UrlFetchApp.fetchAll(requests.slice(i * n, (i + 1) * n)).forEach(
        (r) =>
          r.getContentText() && results.push(JSON.parse(r.getContentText())),
      );
    }
    return results;
  }

  generateContent(object, retry) {
    if (!object || typeof object !== "object")
      throw new Error("Please set object including question.");
    if (retry === undefined) retry = this.skillFolderId ? 15 : 5;

    let { q, jsonSchema, parts } = object;
    if (!q && !jsonSchema && (!parts || !Array.isArray(parts)))
      throw new Error("Please set a question.");
    if (!q && jsonSchema && !parts)
      q = `Follow JSON schema.<JSONSchema>${JSON.stringify(jsonSchema)}</JSONSchema>`;

    // Sanitize parameters to avoid INVALID_ARGUMENT crashes caused by empty required arrays.
    const function_declarations = Object.entries(this.functions).reduce(
      (acc, [k, v]) => {
        if (k !== "params_") {
          let parameters = this.functions.params_[k]?.parameters;
          if (
            parameters &&
            Array.isArray(parameters.required) &&
            parameters.required.length === 0
          ) {
            parameters = { ...parameters };
            delete parameters.required;
          }
          acc.push({
            name: k,
            description: this.functions.params_[k]?.description,
            parameters: parameters,
          });
        }
        return acc;
      },
      [],
    );

    const files = this.fileList.flatMap(({ files, mimeType, uri, name }) => {
      if (files && Array.isArray(files)) {
        let fileName = files[0].displayName.split("@").pop().split("$")[0];
        return [
          {
            text: `[Filename of the following file is ${fileName}. Total pages are ${files.length}.]`,
          },
          ...files.map((f) => ({
            fileData: { fileUri: f.uri, mimeType: f.mimeType },
          })),
        ];
      }
      return [
        {
          text: `[Filename of the following file is ${name}. Total pages are 1.]`,
        },
        { fileData: { fileUri: uri, mimeType } },
      ];
    });

    const contents = [...this.history];
    if (!q && !jsonSchema && parts)
      contents.push({ parts: [...parts, ...files], role: "user" });
    else contents.push({ parts: [{ text: q }, ...files], role: "user" });

    let check = [];
    let usageMetadataObj;
    let results = [];
    let rawResult = {};
    let multipleResults = false;
    let continueLoop = false;
    let toolCallHistory = new Set();
    let forceHaltResult = null;

    const url = this.addQueryParameters_(
      this.urlGenerateContent,
      this.queryParameters,
    );
    const requestHeaders = this.queryParameters.key
      ? {}
      : { headers: this.headers };

    do {
      retry--;
      const payload = { contents };
      const toolsArray = [];

      if (function_declarations.length > 0)
        toolsArray.push({ function_declarations });
      if (this.tools && this.tools.length > 0) toolsArray.push(...this.tools);
      if (toolsArray.length > 0) payload.tools = toolsArray;

      payload.generationConfig = { ...this.generationConfig };
      if (this.response_mime_type)
        payload.generationConfig.response_mime_type = this.response_mime_type;
      if (this.response_schema) {
        payload.generationConfig.response_schema = this.response_schema;
        payload.generationConfig.response_mime_type = "application/json";
      }
      if (this.temperature !== null)
        payload.generationConfig.temperature = this.temperature;
      if (this.systemInstruction)
        payload.systemInstruction = this.systemInstruction;

      let currentToolConfig = { ...this.toolConfig };
      if (
        function_declarations.length > 0 ||
        (this.tools && this.tools.length > 0)
      ) {
        currentToolConfig.functionCallingConfig =
          currentToolConfig.functionCallingConfig || { mode: "AUTO" };
        if (
          function_declarations.length > 0 &&
          this.tools &&
          this.tools.length > 0
        ) {
          currentToolConfig.includeServerSideToolInvocations = true;
          currentToolConfig.include_server_side_tool_invocations = true;
        }
      }
      if (Object.keys(currentToolConfig).length > 0)
        payload.toolConfig = currentToolConfig;

      const res = this.fetch_(
        {
          url,
          method: "post",
          payload: JSON.stringify(payload),
          contentType: "application/json",
          ...requestHeaders,
          muteHttpExceptions: true,
        },
        false,
      );
      const code = res.getResponseCode();

      if ([500, 502, 503, 429].includes(code) && retry > 0) {
        console.warn(
          `[GeminiWithFiles] Caught HTTP ${code}. Retrying in 3 seconds...`,
        );
        Utilities.sleep(3000);
        return this.generateContent({ q, jsonSchema, parts }, retry);
      } else if (code !== 200) {
        throw new Error(`[Gemini API Error] ${res.getContentText()}`);
      }

      const raw = JSON.parse(res.getContentText());
      rawResult = raw;
      const { candidates, usageMetadata } = raw;
      usageMetadataObj = usageMetadata;

      if (!candidates || candidates.length === 0) break;
      const candidate = candidates[0];

      // === SMART RECOVERY & HALLUCINATION PREVENTION ===
      if (
        candidate.finishReason === "MALFORMED_FUNCTION_CALL" &&
        candidate.finishMessage
      ) {
        const msg = candidate.finishMessage;
        const match = msg.match(/([A-Za-z0-9_]+)\s*(\{(?:.|\n)*\})/);
        if (match) {
          let fnName = match[1];
          let argStr = match[2];
          argStr = argStr.replace(/([{,]\s*)([A-Za-z0-9_]+)\s*:/g, '$1"$2":');
          argStr = argStr.replace(/'/g, '"');

          try {
            const argsObj = JSON.parse(argStr);
            console.warn(
              `[GeminiWithFiles] Recovered from MALFORMED_FUNCTION_CALL. Attempting implicit execution of ${fnName}...`,
            );

            if (fnName.startsWith("google_interpreter_"))
              fnName = fnName.replace("google_interpreter_", "");
            const sig = `${fnName}::${JSON.stringify(argsObj)}`;
            let res2;

            if (toolCallHistory.has(sig)) {
              res2 = `[System Intervention] You have already executed '${fnName}' with these exact arguments. Do not repeat. Provide your final answer.`;
            } else if (typeof this.functions[fnName] !== "function") {
              const available = Object.keys(this.functions)
                .filter((k) => k !== "params_")
                .join(", ");
              res2 = `[System Intervention] The tool '${fnName}' does not exist. Available tools are: [${available}]. DO NOT hallucinate or invent function names. Please select a valid tool from the list or respond directly if no tool is applicable.`;
            } else {
              toolCallHistory.add(sig);
              try {
                res2 = this.functions[fnName](argsObj);
              } catch (err) {
                res2 = `[System Intervention] Error: ${err.message}`;
              }
            }

            contents.push({
              parts: [
                {
                  text: `[System Recovery] Attempted to implicitly execute function '${fnName}'. Result:\n${res2}`,
                },
              ],
              role: "user",
            });
            this.history = contents;
            continueLoop = true;

            if (this.toolConfig?.functionCallingConfig?.mode === "any") {
              this.toolConfig.functionCallingConfig.mode = "AUTO";
              delete this.toolConfig.functionCallingConfig.allowedFunctionNames;
            }
            continue;
          } catch (e) {
            console.warn(
              `[GeminiWithFiles] Failed to recover malformed arguments: ${e.message}`,
            );
          }
        }
      }

      if (!candidate.content?.parts) {
        results.push(candidate);
        break;
      }

      const partsAr = candidate.content.parts;
      results.push(...partsAr);
      contents.push({ parts: [...partsAr], role: "model" });

      check = partsAr.filter((pp) => pp.functionCall?.name);
      continueLoop = false;
      let hasCodeExecutionResult = partsAr.some((pp) => pp.codeExecutionResult);
      let hasText = partsAr.some((pp) => pp.text);

      if (check.length > 0) {
        if (check.length > 1) multipleResults = true;

        let hallucinationOccurred = false;
        for (const chk of check) {
          let functionName = chk.functionCall.name;
          if (functionName.includes(":"))
            functionName = functionName.split(":").pop();
          if (functionName.startsWith("google_interpreter_"))
            functionName = functionName.replace("google_interpreter_", "");

          if (typeof this.functions[functionName] !== "function") {
            hallucinationOccurred = true;
          }
        }

        if (hallucinationOccurred) {
          console.warn(
            "[GeminiWithFiles] Hallucination detected. A requested function does not exist.",
          );
          const available = Object.keys(this.functions)
            .filter((k) => k !== "params_")
            .join(", ");

          const lastModelMsg = contents[contents.length - 1];
          if (lastModelMsg && lastModelMsg.role === "model") {
            lastModelMsg.parts = lastModelMsg.parts.map((p) => {
              if (p.functionCall) {
                let fName = p.functionCall.name;
                if (fName.includes(":")) fName = fName.split(":").pop();
                if (fName.startsWith("google_interpreter_"))
                  fName = fName.replace("google_interpreter_", "");
                if (typeof this.functions[fName] !== "function") {
                  return {
                    text: `[Model attempted to call non-existent function: ${fName}]`,
                  };
                }
              }
              return p;
            });
          }

          contents.push({
            role: "user",
            parts: [
              {
                text: `[System Intervention] You attempted to use a function that does not exist. Available tools are: [${available}]. DO NOT hallucinate or invent function names. Try again.`,
              },
            ],
          });

          this.history = contents;
          continueLoop = true;

          if (this.toolConfig?.functionCallingConfig?.mode === "any") {
            this.toolConfig.functionCallingConfig.mode = "AUTO";
            delete this.toolConfig.functionCallingConfig.allowedFunctionNames;
          }
          continue;
        }

        const partss = [];
        for (const chk of check) {
          let functionName = chk.functionCall.name;
          if (functionName.includes(":"))
            functionName = functionName.split(":").pop();
          if (functionName.startsWith("google_interpreter_"))
            functionName = functionName.replace("google_interpreter_", "");

          const argsObj = chk.functionCall.args || null;
          const sig = `${functionName}::${JSON.stringify(argsObj)}`;
          let res2;

          if (toolCallHistory.has(sig)) {
            console.warn(
              `[GeminiWithFiles] Loop detected. Prevented duplicate call to '${functionName}'.`,
            );
            res2 = `[System Intervention] You have already executed '${functionName}' with these exact arguments. Do not repeat this action. Please synthesize and provide your final answer immediately.`;
          } else {
            toolCallHistory.add(sig);
            try {
              res2 = this.functions[functionName](argsObj);
            } catch (err) {
              res2 = `[System Intervention] The tool '${functionName}' encountered an execution error: ${err.message}.`;
            }
          }

          // === DYNAMIC HALT SIGNAL ===
          if (res2 && typeof res2 === "object" && res2._gemini_halt) {
            forceHaltResult = res2;
            partss.push({
              functionResponse: {
                name: functionName,
                response: { name: functionName, content: res2 },
                ...(chk.functionCall.id ? { id: chk.functionCall.id } : {}),
              },
            });
            break; // Break the tools iteration loop
          }

          if (
            functionName.startsWith("customType_") &&
            typeof this.functions[functionName] === "function"
          ) {
            if (res2?.items && Object.keys(res2).length === 1)
              return res2.items;
            if (
              Array.isArray(res2) &&
              res2.every((e) => e?.items && Object.keys(e).length === 1)
            )
              return res2.map((e) => e.items);
            return res2;
          }

          partss.push({
            functionResponse: {
              name: functionName,
              response: { name: functionName, content: res2 },
              ...(chk.functionCall.id ? { id: chk.functionCall.id } : {}),
            },
          });
        }

        contents.push({ parts: partss, role: "function" });
        this.history = contents;

        if (forceHaltResult) {
          continueLoop = false;
        } else {
          continueLoop = true;
          if (this.toolConfig?.functionCallingConfig?.mode === "any") {
            this.toolConfig.functionCallingConfig.mode = "AUTO";
            delete this.toolConfig.functionCallingConfig.allowedFunctionNames;
          }
        }
      } else if (hasCodeExecutionResult && !hasText) {
        this.history = contents;
        contents.push({
          role: "user",
          parts: [
            {
              text: "Please provide the final answer based on the code execution result.",
            },
          ],
        });
        continueLoop = true;
      } else {
        this.history = contents;
        continueLoop = false;
      }
    } while (continueLoop && retry > 0);

    if (this.exportRawData) return rawResult;
    if (continueLoop && retry <= 0)
      throw new Error(
        "[GeminiWithFiles Error] Maximum retry limit exceeded. The model got stuck in an unresolvable loop.",
      );

    // Provide the forced halt response securely maintaining formatting configurations
    if (forceHaltResult) {
      if (this.exportTotalTokens) {
        return {
          returnValue: forceHaltResult,
          usageMetadata: usageMetadataObj,
        };
      }
      return forceHaltResult;
    }

    const output = results[results.length - 1];
    if (
      !output ||
      (output.finishReason &&
        ["OTHER", "RECITATION"].includes(output.finishReason))
    )
      return "No values.";

    let returnValue = multipleResults
      ? results.filter((pp) => pp.functionResponse)
      : output.text
        ? output.text.trim()
        : output;

    try {
      if (this.exportTotalTokens)
        return {
          returnValue: JSON.parse(returnValue),
          usageMetadata: usageMetadataObj,
        };
      return JSON.parse(returnValue);
    } catch (stack) {
      if (this.exportTotalTokens)
        return { returnValue, usageMetadata: usageMetadataObj };
      return returnValue;
    }
  }

  chat(obj, options = {}) {
    this.exportRawData = true;
    for (const [k, v] of Object.entries(options)) {
      if (this[k] !== undefined) this[k] = v;
    }
    return this.generateContent(obj);
  }

  _discoverSkills() {
    const cache = CacheService.getScriptCache();
    const cachedData = cache.get(`agent_skills_${this.skillFolderId}`);
    if (cachedData) return JSON.parse(cachedData);
    const folder = DriveApp.getFolderById(this.skillFolderId);
    const folders = folder.getFolders();
    const skills = {};
    while (folders.hasNext()) {
      const subFolder = folders.next();
      const files = subFolder.getFilesByName("SKILL.md");
      if (files.hasNext()) {
        const content = files.next().getBlob().getDataAsString();
        const parsed = this._parseSkillMd(content);
        if (parsed)
          skills[parsed.name] = {
            name: parsed.name,
            description: parsed.description,
            instructions: parsed.instructions,
            folderId: subFolder.getId(),
          };
      }
    }
    const txtFiles = folder.getFilesByType(MimeType.PLAIN_TEXT);
    while (txtFiles.hasNext()) {
      const txtFile = txtFiles.next();
      if (txtFile.getName().endsWith(".txt")) {
        const name = txtFile.getName().replace(".txt", "");
        const content = txtFile.getBlob().getDataAsString();
        skills[name] = {
          name: name,
          description: content.substring(0, 150),
          instructions: content,
          folderId: folder.getId(),
        };
      }
    }
    cache.put(
      `agent_skills_${this.skillFolderId}`,
      JSON.stringify(skills),
      3600,
    );
    return skills;
  }

  _activateSkill(skillName) {
    const skills = this._discoverSkills();
    const skill = skills[skillName];
    if (!skill) return `[Error] Skill '${skillName}' not found.`;
    const files = DriveApp.getFolderById(skill.folderId).getFiles();
    const fileNames = [];
    while (files.hasNext()) fileNames.push(files.next().getName());
    return `[System: Skill Activated]\nInstructions:\n${skill.instructions}\n\nAvailable Resources (Files):\n${fileNames.join(", ")}`;
  }

  _readSkillResource(skillName, fileName) {
    const skills = this._discoverSkills();
    const skill = skills[skillName];
    if (!skill) return `[Error] Skill '${skillName}' not found.`;
    const files = DriveApp.getFolderById(skill.folderId).getFilesByName(
      fileName,
    );
    if (!files.hasNext())
      return `[Error] File '${fileName}' not found in skill '${skillName}'.`;
    return files.next().getBlob().getDataAsString();
  }

  _runDynamicScript(skillName, scriptName, argsJSON) {
    const scriptContent = this._readSkillResource(skillName, scriptName);
    if (scriptContent.startsWith("[Error]")) return scriptContent;
    try {
      const parsedArgs =
        typeof argsJSON === "string" ? JSON.parse(argsJSON) : argsJSON;
      const executableFunc = new Function("args", scriptContent);
      return executableFunc(parsedArgs);
    } catch (e) {
      return `Script Execution Error: ${e.message}`;
    }
  }

  _invokeAgent(agentName, prompt) {
    const skills = this._discoverSkills();
    const subSkill = skills[agentName];
    if (!subSkill) return `[Error] Subagent skill '${agentName}' not found.`;
    try {
      const subagentSystemInstruction = `[SUBAGENT ROLE: ${agentName}]\nInstructions for this role:\n${subSkill.instructions}\n\n`;
      const options = {
        model: this.model,
        version: this.version,
        systemInstruction: subagentSystemInstruction,
        skillFolderId: this.skillFolderId,
        propertiesService: this.propertiesService,
        temperature: this.temperature,
        generationConfig: this.generationConfig,
      };
      if (this.queryParameters.key) options.apiKey = this.queryParameters.key;
      if (this.accessToken && !this.queryParameters.key)
        options.accessToken = this.accessToken;
      const subagent = new GeminiWithFiles(options);
      const res = subagent.generateContent({ q: prompt });
      return typeof res === "string" ? res : JSON.stringify(res);
    } catch (e) {
      return `[Error] Subagent execution failed: ${e.message}`;
    }
  }

  _parseSkillMd(content) {
    const normalized = content.replace(/\r\n/g, "\n");
    const match = normalized.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
    if (!match) return null;
    const yaml = match[1];
    const nameMatch = yaml.match(/name:\s*(.+)/);
    const descMatch = yaml.match(/description:\s*(.+)/);
    return {
      name: nameMatch ? nameMatch[1].trim() : "unknown",
      description: descMatch ? descMatch[1].trim() : "",
      instructions: match[2].trim(),
    };
  }

  addQueryParameters_(url, obj) {
    if (!url) return "";
    const params = Object.entries(obj)
      .flatMap(([k, v]) =>
        Array.isArray(v)
          ? v.map((e) => `${k}=${encodeURIComponent(e)}`)
          : `${k}=${encodeURIComponent(v)}`,
      )
      .join("&");
    return params ? `${url}?${params}` : url;
  }

  fetch_(obj, checkError = true) {
    obj.muteHttpExceptions = true;
    const res = UrlFetchApp.fetchAll([obj])[0];
    if (checkError && res.getResponseCode() !== 200)
      throw new Error(res.getContentText());
    return res;
  }
};
