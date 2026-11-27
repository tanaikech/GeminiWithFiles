/**
 * GeminiWithFiles
 * Author: Kanshi Tanaike
 * Version: 2.1.1
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
      useParametersJsonSchema = false,
      modelRouting,
      routingRole = "default",
      routingPrompt = null,
      remainingMs = null,
      forceMaxCapability = false,
      onRoutingLog = null,
      _routingResolved = false,
    } = object;

    // Updated default model to models/gemini-4-hydrogen
    this.model = model || "models/gemini-4-hydrogen";
    this.version = version || "v1beta";
    this.useParametersJsonSchema = Boolean(useParametersJsonSchema);
    this._lastModelParts = [];
    this.modelRouting = modelRouting !== undefined ? modelRouting : "efficient";
    this.routingRole = routingRole || "default";
    this.routingPrompt = routingPrompt || null;
    this.remainingMs = remainingMs;
    this.forceMaxCapability = Boolean(forceMaxCapability);
    this.onRoutingLog = typeof onRoutingLog === "function" ? onRoutingLog : null;
    this._routingResolved = Boolean(_routingResolved);
    this._lastRoutingDecision = null;

    const baseUrl = "https://generativelanguage.googleapis.com";
    this.baseUrl = baseUrl;
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
            systemInstruction.parts.map((p) => p.text || "").join("\n") +
            "\n\n";
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

  /**
   * Helper method to extract the original filename from a Gemini File API displayName.
   * Removes 'fileId@' or 'blobName@' prefixes and '$page@X$maxPage@Y' suffixes safely.
   */
  _extractOriginalFilename(displayName) {
    if (!displayName) return "unknown_file";
    const match = displayName.match(
      /^(?:fileId|blobName)@(.+?)(?:\$page@\d+\$maxPage@\d+)?$/,
    );
    return match && match[1] ? match[1] : displayName;
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
      let k = this._extractOriginalFilename(e.displayName);
      if (obj.has(k)) obj.get(k).push(e);
      else obj.set(k, [e]);
    }
    this.fileList = Array.from(obj.values()).map((files) => {
      // Only sort if there are multiple parts matching the PDF page convention
      if (
        files.length > 1 &&
        files[0].displayName.match(/\$page@\d+\$maxPage@\d+$/)
      ) {
        files.sort((a, b) => {
          const getPage = (name) => {
            const m = name.match(/\$page@(\d+)/);
            return m ? Number(m[1]) : 0;
          };
          return getPage(a.displayName) - getPage(b.displayName);
        });
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

  generateContentInternal(object, retry) {
    if (!object || typeof object !== "object")
      throw new Error("Please set object including question.");
    if (retry === undefined) retry = this.skillFolderId ? 15 : 5;

    let { q, jsonSchema, parts } = object;
    if (!q && !jsonSchema && (!parts || !Array.isArray(parts)))
      throw new Error("Please set a question.");
    if (!q && jsonSchema && !parts)
      q = `Follow JSON schema.<JSONSchema>${JSON.stringify(jsonSchema)}</JSONSchema>`;

    // Build function_declarations: use parametersJsonSchema when opted in on v1beta,
    // otherwise recursively sanitize parameters for universal OpenAPI 3.0 Schema compatibility.
    const function_declarations = Object.entries(this.functions).reduce(
      (acc, [k, v]) => {
        if (k !== "params_") {
          const rawParameters = this.functions.params_[k]?.parameters;
          const decl = {
            name: k,
            description: this.functions.params_[k]?.description,
          };
          if (this.useParametersJsonSchema && this.version === "v1beta") {
            if (rawParameters && typeof rawParameters === "object") {
              const isEmptyObj =
                String(rawParameters.type || "").toLowerCase() === "object" &&
                (!rawParameters.properties ||
                  Object.keys(rawParameters.properties).length === 0);
              if (!isEmptyObj) {
                decl.parametersJsonSchema = rawParameters;
              }
            }
          } else {
            const sanitizedParameters = this._sanitizeToolParameters(
              rawParameters,
              true,
            );
            if (sanitizedParameters !== undefined) {
              decl.parameters = sanitizedParameters;
            }
          }
          acc.push(decl);
        }
        return acc;
      },
      [],
    );

    const files = this.fileList.flatMap(({ files, mimeType, uri, name }) => {
      if (files && Array.isArray(files)) {
        let fileName = this._extractOriginalFilename(files[0].displayName);
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
    let cumulativeInputTokens = 0;
    let cumulativeOutputTokens = 0;
    let cumulativeTotalTokens = 0;
    let decisionsTokenCount = 0;
    let llmCallCount = 0;
    let results = [];
    let lastPartsAr = [];
    let rawResult = {};
    let multipleResults = false;
    let continueLoop = false;
    let toolCallHistory = new Set();
    let forceHaltResult = null;

    // Resolve dynamic model & thinkingConfig ONCE per generateContent call (never mutate this.model)
    let activeModel = object._pinnedModel || this.model;
    let activeGenConfig = object._pinnedGenConfig
      ? { ...object._pinnedGenConfig }
      : { ...this.generationConfig };
    let routingDecision = object._pinnedRoutingDecision || null;
    const hasToolsForRouting =
      function_declarations.length > 0 || (this.tools && this.tools.length > 0);
    const shouldRoute =
      !this._routingResolved &&
      !object._routingResolved &&
      typeof GeminiDecisionsRouter === "function";

    if (shouldRoute) {
      const promptForRouting =
        this.routingPrompt ||
        q ||
        (Array.isArray(parts)
          ? parts
              .filter((p) => p && typeof p.text === "string")
              .map((p) => p.text)
              .join("\n")
          : "");
      const routed = GeminiDecisionsRouter.route({
        apiKey: this.queryParameters.key || null,
        prompt: promptForRouting,
        role: this.routingRole,
        configuredModel: this.model,
        configuredGenerationConfig: this.generationConfig,
        hasTools: hasToolsForRouting,
        modelRouting: this.modelRouting,
        remainingMs: this.remainingMs,
        forceMaxCapability: this.forceMaxCapability,
        onLog: this.onRoutingLog,
        consoleLogFallback: !this.onRoutingLog,
      });
      activeModel = routed.model;
      activeGenConfig = routed.generationConfig || {};
      routingDecision = routed.routingDecision;
      decisionsTokenCount = routingDecision?.decisionsInputTokens || 0;
      cumulativeInputTokens += decisionsTokenCount;
      cumulativeTotalTokens += decisionsTokenCount;
    }
    this._lastRoutingDecision = routingDecision;

    const normActiveModel = activeModel.startsWith("models/")
      ? activeModel
      : `models/${activeModel}`;
    const isGemini4 = /(?:^|\/)gemini-4(?:[-.]|$)/i.test(normActiveModel);

    const activeBaseUrl = this.baseUrl || "https://generativelanguage.googleapis.com";
    const activeGenerateUrl = `${activeBaseUrl}/${this.version}/${normActiveModel}:generateContent`;
    const url = this.addQueryParameters_(
      activeGenerateUrl,
      this.queryParameters,
    );
    const requestHeaders = this.queryParameters.key
      ? {}
      : { headers: this.headers };

    const formatReturnValue = (val) => {
      if (!this.exportTotalTokens) return val;
      return {
        returnValue: val,
        usageMetadata: usageMetadataObj,
        inputTokenCount: cumulativeInputTokens,
        outputTokenCount: cumulativeOutputTokens,
        totalTokenCount: cumulativeTotalTokens,
        decisionsTokenCount,
        llmCallCount,
        routingDecision,
      };
    };

    do {
      retry--;
      const payload = { contents };
      const toolsArray = [];

      if (function_declarations.length > 0)
        toolsArray.push({ function_declarations });
      if (this.tools && this.tools.length > 0) toolsArray.push(...this.tools);
      if (toolsArray.length > 0) payload.tools = toolsArray;

      payload.generationConfig = { ...activeGenConfig };
      if (payload.generationConfig.thinkingConfig) {
        payload.generationConfig.thinkingConfig = {
          ...payload.generationConfig.thinkingConfig,
        };
      }
      if (this.response_mime_type)
        payload.generationConfig.response_mime_type = this.response_mime_type;
      if (this.response_schema) {
        delete payload.generationConfig.responseJsonSchema;
        delete payload.generationConfig.response_json_schema;
        payload.generationConfig.response_schema = this.response_schema;
        payload.generationConfig.response_mime_type = "application/json";
      } else if (this.response_json_schema) {
        delete payload.generationConfig.response_schema;
        delete payload.generationConfig.responseSchema;
        payload.generationConfig.responseJsonSchema = this.response_json_schema;
        if (
          !payload.generationConfig.response_mime_type &&
          !payload.generationConfig.responseMimeType
        ) {
          payload.generationConfig.response_mime_type = "application/json";
        }
      }
      if (this.temperature !== null)
        payload.generationConfig.temperature = this.temperature;

      // Universal model-generation thinkingConfig & parameter compatibility guard
      if (typeof GeminiDecisionsRouter === "function") {
        const cfgForGuard = GeminiDecisionsRouter.normalizeRoutingConfig(this.modelRouting);
        const normGuard = GeminiDecisionsRouter.normalizeThinkingConfig(
          normActiveModel,
          null,
          payload.generationConfig,
          cfgForGuard.modelCatalog,
          { allowXHighInGas: cfgForGuard.allowXHighInGas },
        );
        payload.generationConfig = normGuard.generationConfig;
      } else if (isGemini4) {
        delete payload.generationConfig.frequencyPenalty;
        delete payload.generationConfig.frequency_penalty;
        delete payload.generationConfig.presencePenalty;
        delete payload.generationConfig.presence_penalty;
        delete payload.generationConfig.candidateCount;
        delete payload.generationConfig.candidate_count;
        if (payload.generationConfig.thinkingConfig) {
          const tc = payload.generationConfig.thinkingConfig;
          if (tc.thinkingBudget !== undefined) {
            const oldBudget = tc.thinkingBudget;
            delete tc.thinkingBudget;
            if (oldBudget === 0 && !tc.thinkingLevel) {
              tc.thinkingLevel = "LOW";
            }
          }
          if (tc.thinkingLevel) {
            const normLevel = String(tc.thinkingLevel).toUpperCase();
            tc.thinkingLevel = normLevel === "MINIMAL" ? "LOW" : normLevel;
          }
        }
      }

      if (this.systemInstruction)
        payload.systemInstruction = this.systemInstruction;

      let currentToolConfig = { ...this.toolConfig };
      if (
        function_declarations.length > 0 ||
        (this.tools && this.tools.length > 0)
      ) {
        currentToolConfig.functionCallingConfig =
          currentToolConfig.functionCallingConfig
            ? { ...currentToolConfig.functionCallingConfig }
            : { mode: "AUTO" };
        if (currentToolConfig.functionCallingConfig.mode) {
          currentToolConfig.functionCallingConfig.mode = String(
            currentToolConfig.functionCallingConfig.mode,
          ).toUpperCase();
        }
        if (
          function_declarations.length > 0 &&
          this.tools &&
          this.tools.length > 0
        ) {
          currentToolConfig.includeServerSideToolInvocations = true;
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

      // Paid-only model Free-Tier auto-fallback (billingTier: "auto")
      if (
        [403, 404, 429].includes(code) &&
        !object._paidFallbackAttempted &&
        typeof GeminiDecisionsRouter === "function"
      ) {
        const cfgCheck = GeminiDecisionsRouter.normalizeRoutingConfig(this.modelRouting);
        if (
          cfgCheck.mode !== "fixed" &&
          cfgCheck.billingTier === "auto" &&
          GeminiDecisionsRouter.isPaidOnlyModel(normActiveModel, cfgCheck.modelCatalog)
        ) {
          GeminiDecisionsRouter.markPaidModelUnavailable(normActiveModel);
          const fallbackModel = GeminiDecisionsRouter.normalizeModelName(
            cfgCheck.modelPool.workhorse || "models/gemini-4-hydrogen",
          );
          const normFallback = GeminiDecisionsRouter.normalizeThinkingConfig(
            fallbackModel,
            "HIGH",
            activeGenConfig,
            cfgCheck.modelCatalog,
            { allowXHighInGas: cfgCheck.allowXHighInGas },
          );
          const fbDecision = {
            ...(routingDecision || {}),
            model: fallbackModel,
            thinkingLevel: normFallback.resolvedThinkingLevel,
            thinkingConfig: normFallback.generationConfig.thinkingConfig || null,
            reason: `paid_tier_auto_fallback(${normActiveModel}->${fallbackModel}, HTTP ${code})`,
            fallbackReason: `HTTP ${code} on paid-only model ${normActiveModel}`,
          };
          if (cfgCheck.logRouting !== false) {
            const msg = GeminiDecisionsRouter.formatLogMessage(fbDecision);
            if (typeof this.onRoutingLog === "function") this.onRoutingLog(msg, fbDecision);
            else console.log(msg);
          }
          return this.generateContentInternal(
            {
              q,
              jsonSchema,
              parts,
              _routingResolved: true,
              _paidFallbackAttempted: true,
              _pinnedModel: fallbackModel,
              _pinnedGenConfig: normFallback.generationConfig,
              _pinnedRoutingDecision: fbDecision,
            },
            retry,
          );
        }
      }

      const httpErrorRetries = Number(object._httpErrorRetries || 0);
      if ([500, 502, 503, 504, 429].includes(code) && retry > 0 && httpErrorRetries < 2) {
        let retryModel = normActiveModel;
        let retryGenConfig = activeGenConfig;
        let retryDecision = routingDecision;

        // If a heavyweight frontierMax model hits 503/504, step down to frontierFast (MEDIUM) to prevent repeated GAS hangs
        if (
          [503, 504].includes(code) &&
          typeof GeminiDecisionsRouter === "function"
        ) {
          const cfgStep = GeminiDecisionsRouter.normalizeRoutingConfig(this.modelRouting);
          const frontierMaxModel = GeminiDecisionsRouter.normalizeModelName(
            cfgStep.modelPool.frontierMax || "models/gemini-4-carbon",
          );
          if (cfgStep.mode !== "fixed" && normActiveModel === frontierMaxModel) {
            const stepDownModel = GeminiDecisionsRouter.normalizeModelName(
              cfgStep.modelPool.frontierFast || "models/gemini-4-argon",
            );
            const normStep = GeminiDecisionsRouter.normalizeThinkingConfig(
              stepDownModel,
              "MEDIUM",
              activeGenConfig,
              cfgStep.modelCatalog,
              { allowXHighInGas: cfgStep.allowXHighInGas },
            );
            retryModel = stepDownModel;
            retryGenConfig = normStep.generationConfig;
            retryDecision = {
              ...(routingDecision || {}),
              model: stepDownModel,
              thinkingLevel: normStep.resolvedThinkingLevel,
              thinkingConfig: normStep.generationConfig.thinkingConfig || null,
              reason: `frontier_timeout_stepdown(${normActiveModel}->${stepDownModel}, HTTP ${code})`,
              fallbackReason: `HTTP ${code} on ${normActiveModel}`,
            };
            if (cfgStep.logRouting !== false) {
              const msg = GeminiDecisionsRouter.formatLogMessage(retryDecision);
              if (typeof this.onRoutingLog === "function") this.onRoutingLog(msg, retryDecision);
              else console.log(msg);
            }
          }
        }

        console.warn(
          `[GeminiWithFiles] Caught HTTP ${code} (attempt ${httpErrorRetries + 1}/2). Retrying in 3 seconds with ${retryModel}...`,
        );
        Utilities.sleep(3000);
        return this.generateContentInternal(
          {
            q,
            jsonSchema,
            parts,
            _routingResolved: true,
            _paidFallbackAttempted: object._paidFallbackAttempted,
            _httpErrorRetries: httpErrorRetries + 1,
            _pinnedModel: retryModel,
            _pinnedGenConfig: retryGenConfig,
            _pinnedRoutingDecision: retryDecision,
          },
          retry,
        );
      } else if (code !== 200) {
        throw new Error(`[Gemini API Error] ${res.getContentText()}`);
      }

      const raw = JSON.parse(res.getContentText());
      rawResult = raw;
      const { candidates, usageMetadata } = raw;
      usageMetadataObj = usageMetadata;
      llmCallCount++;
      if (usageMetadata) {
        cumulativeInputTokens += usageMetadata.promptTokenCount || 0;
        cumulativeOutputTokens +=
          (usageMetadata.candidatesTokenCount || 0) +
          (usageMetadata.thoughtsTokenCount || 0);
        cumulativeTotalTokens += usageMetadata.totalTokenCount || 0;
      }

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

            if (
              this.toolConfig?.functionCallingConfig?.mode?.toUpperCase() ===
              "ANY"
            ) {
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
      lastPartsAr = partsAr;
      this._lastModelParts = partsAr;
      results.push(...partsAr);
      contents.push({ parts: [...partsAr], role: "model" });

      check = partsAr.filter((pp) => pp.functionCall?.name);
      continueLoop = false;
      let hasCodeExecutionResult = partsAr.some((pp) => pp.codeExecutionResult);
      let hasText = partsAr.some((pp) => pp.text && !pp.thought);

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

          if (
            this.toolConfig?.functionCallingConfig?.mode?.toUpperCase() ===
            "ANY"
          ) {
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

          const argsObj = chk.functionCall.args || {};
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
            break;
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

        contents.push({ parts: partss, role: "user" });
        this.history = contents;

        if (forceHaltResult) {
          continueLoop = false;
        } else {
          continueLoop = true;
          if (
            this.toolConfig?.functionCallingConfig?.mode?.toUpperCase() ===
            "ANY"
          ) {
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

    if (forceHaltResult) {
      return formatReturnValue(forceHaltResult);
    }

    const nonThoughtTextParts = (lastPartsAr || []).filter(
      (p) => p && typeof p.text === "string" && !p.thought,
    );
    const nonThoughtParts = (lastPartsAr || []).filter((p) => p && !p.thought);
    const output =
      nonThoughtParts[nonThoughtParts.length - 1] ||
      results[results.length - 1];

    if (
      !output ||
      (output.finishReason &&
        ["OTHER", "RECITATION"].includes(output.finishReason))
    )
      return formatReturnValue("No values.");

    let returnValue =
      nonThoughtTextParts.length > 0
        ? nonThoughtTextParts.map((p) => p.text).join("").trim()
        : output.text && !output.thought
          ? output.text.trim()
          : output;

    let parsedReturnValue;
    try {
      parsedReturnValue = JSON.parse(returnValue);
    } catch (stack) {
      parsedReturnValue = returnValue;
    }

    return formatReturnValue(parsedReturnValue);
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
        modelRouting: this.modelRouting,
        routingRole: "subagent",
        remainingMs: this.remainingMs,
        forceMaxCapability: this.forceMaxCapability,
        onRoutingLog: this.onRoutingLog,
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

  /**
   * Recursively sanitizes JSON Schema / MCP inputSchema objects for Gemini
   * FunctionDeclaration.parameters (OpenAPI 3.0 Schema protobuf) using a strict
   * whitelist so unknown JSON Schema or vendor keywords (e.g., `deprecated`,
   * `x-google-enum-descriptions`, `$schema`, `additionalProperties`, `default`)
   * can never trigger HTTP 400 INVALID_ARGUMENT.
   */
  _sanitizeToolParameters(schema, isRoot = false) {
    if (!schema || typeof schema !== "object") return undefined;

    const allowedKeys = new Set([
      "type",
      "format",
      "description",
      "nullable",
      "enum",
      "items",
      "maxItems",
      "minItems",
      "properties",
      "required",
      "anyOf",
      "minimum",
      "maximum",
      "pattern",
    ]);

    const cleaned = {};
    for (const [k, v] of Object.entries(schema)) {
      if (!allowedKeys.has(k) || v === undefined) continue;

      if (k === "type") {
        if (Array.isArray(v)) {
          const nonNull = v.find((t) => String(t).toLowerCase() !== "null");
          if (nonNull) cleaned.type = nonNull;
          if (v.some((t) => String(t).toLowerCase() === "null")) {
            cleaned.nullable = true;
          }
        } else {
          cleaned.type = v;
        }
      } else if (k === "required") {
        if (Array.isArray(v) && v.length > 0) {
          cleaned.required = v;
        }
      } else if (k === "properties" && v && typeof v === "object") {
        const cleanedProps = {};
        for (const [pk, pv] of Object.entries(v)) {
          const sanitizedProp = this._sanitizeToolParameters(pv, false);
          if (sanitizedProp !== undefined) {
            cleanedProps[pk] = sanitizedProp;
          }
        }
        if (Object.keys(cleanedProps).length > 0) {
          cleaned.properties = cleanedProps;
        }
      } else if (k === "items" && v && typeof v === "object") {
        const itemSchema = Array.isArray(v) ? v[0] : v;
        const sanitizedItems = this._sanitizeToolParameters(itemSchema, false);
        if (sanitizedItems !== undefined) {
          cleaned.items = sanitizedItems;
        }
      } else if (k === "anyOf" && Array.isArray(v)) {
        const sanitizedAnyOf = v
          .map((item) => this._sanitizeToolParameters(item, false))
          .filter((item) => item !== undefined);
        if (sanitizedAnyOf.length > 0) {
          cleaned.anyOf = sanitizedAnyOf;
        }
      } else {
        cleaned[k] = v;
      }
    }

    if (cleaned.required && cleaned.properties) {
      cleaned.required = cleaned.required.filter(
        (rk) => Object.prototype.hasOwnProperty.call(cleaned.properties, rk),
      );
      if (cleaned.required.length === 0) delete cleaned.required;
    }

    if (
      String(cleaned.type || "").toLowerCase() === "object" &&
      (!cleaned.properties || Object.keys(cleaned.properties).length === 0)
    ) {
      return isRoot ? undefined : cleaned;
    }

    return Object.keys(cleaned).length > 0 ? cleaned : undefined;
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

  setHookManager(hookManager) {
    this.hookManager = hookManager;
    return this;
  }

  generateContent(object, retry) {
    if (this.hookManager) {
      const beforeResult = this.hookManager.execute("BeforeModel", {
        config: this,
        query: (object && object.q) || "",
        history: this.history || [],
        model: this.model
      });

      if (beforeResult.decision === "deny") {
        throw new Error("Model request blocked by GeminiWithFiles BeforeModel hook.");
      }

      if (beforeResult.query && object) {
        object.q = beforeResult.query;
      }

      const mockedResponse = beforeResult.hookSpecificOutput?.llm_response || beforeResult.llm_response;
      if (mockedResponse && mockedResponse.text !== undefined) {
        return { returnValue: mockedResponse.text, totalTokenCount: 0 };
      }
    }

    const rawRes = this.generateContentInternal(object, retry);

    if (this.hookManager) {
      const textVal = typeof rawRes === 'string' ? rawRes : (rawRes.returnValue || "");
      const afterResult = this.hookManager.execute("AfterModel", {
        text: textVal,
        response: rawRes,
        model: this._lastRoutingDecision?.model || this.model,
        routingDecision: this._lastRoutingDecision || null,
      });

      if (afterResult.decision === "deny") {
        throw new Error("Model response blocked and discarded by AfterModel hook.");
      }

      const modifiedResponse = afterResult.hookSpecificOutput?.llm_response || afterResult.llm_response;
      if (modifiedResponse && modifiedResponse.text !== undefined) {
        return { returnValue: modifiedResponse.text, totalTokenCount: rawRes.totalTokenCount || 0 };
      }
    }

    return rawRes;
  }

  /**
   * Exports current model & thinking routing configuration across fixed/efficient/quality modes as JSON (0 API calls).
   * @returns {Object}
   */
  getModelRoutingConfig() {
    if (typeof GeminiDecisionsRouter !== "function") {
      return {
        version: "2.1.1",
        activeMode: "fixed",
        configuredModel: this.model,
        warnings: ["GeminiDecisionsRouter is not loaded; running in fixed mode."],
      };
    }
    return GeminiDecisionsRouter.getRoutingConfigSummary(this.modelRouting, {
      configuredModel: this.model,
      configuredGenerationConfig: this.generationConfig,
    });
  }

  /**
   * Dry-run preview: calls Decisions API once for a prompt and compares fixed/efficient/quality modes.
   * @param {string} prompt
   * @param {Object} [options={}]
   * @returns {Object}
   */
  previewModelRouting(prompt, options = {}) {
    if (typeof GeminiDecisionsRouter !== "function") {
      throw new Error("GeminiDecisionsRouter is required for previewModelRouting().");
    }
    return GeminiDecisionsRouter.previewRouting({
      apiKey: this.queryParameters.key || null,
      prompt,
      role: options.role || this.routingRole || "direct",
      hasTools: Boolean(options.hasTools),
      configuredModel: this.model,
      configuredGenerationConfig: this.generationConfig,
      modelRouting: this.modelRouting,
      remainingMs: this.remainingMs,
    });
  }

  static getModelRoutingPresets(customConfig = null, context = {}) {
    if (typeof GeminiDecisionsRouter !== "function") return null;
    return GeminiDecisionsRouter.getRoutingConfigSummary(customConfig, context);
  }

  static configureModelRouting(customConfig = {}) {
    if (typeof GeminiDecisionsRouter === "function") {
      GeminiDecisionsRouter.configureDefaults(customConfig);
    }
  }

  static resetModelRoutingDefaults() {
    if (typeof GeminiDecisionsRouter === "function") {
      GeminiDecisionsRouter.resetDefaults();
    }
  }

  fetch_(obj, checkError = true) {
    obj.muteHttpExceptions = true;
    const res = UrlFetchApp.fetchAll([obj])[0];
    if (checkError && res.getResponseCode() !== 200) {
      throw new Error(res.getContentText());
    }
    return res;
  }
};

/**
 * GeminiDecisionsRouter
 * Author: Kanshi Tanaike
 * Version: 2.1.1
 * Description: Zero-dependency, data-driven Gemini Decisions API (gemini-decision-1)
 * dynamic model & thinkingLevel router for GASADK and standalone Gemini GAS libraries.
 * Supports 6-model default pool (gemini-3.5-flash-lite, gemini-3.8-flash,
 * gemini-4-hydrogen, gemini-4-neon, gemini-4-argon, gemini-4-carbon),
 * external future-model customization, JSON comparison export, GAS 6-min timeout
 * guardrails, Free-Tier auto-fallback, and per-generation routing logs.
 */
var GeminiDecisionsRouter =
  typeof GeminiDecisionsRouter !== "undefined"
    ? GeminiDecisionsRouter
    : class GeminiDecisionsRouter {
        static get VERSION() {
          return "2.1.1";
        }

        static get DECISIONS_ENDPOINT() {
          return "https://generativelanguage.googleapis.com/v1beta/decisions";
        }

        static _deepClone(obj) {
          if (obj === null || typeof obj !== "object") return obj;
          return JSON.parse(JSON.stringify(obj));
        }

        static _deepMerge(target, source) {
          const out = GeminiDecisionsRouter._deepClone(target || {});
          if (!source || typeof source !== "object") return out;
          Object.keys(source).forEach((key) => {
            const val = source[key];
            if (
              val &&
              typeof val === "object" &&
              !Array.isArray(val) &&
              out[key] &&
              typeof out[key] === "object" &&
              !Array.isArray(out[key])
            ) {
              out[key] = GeminiDecisionsRouter._deepMerge(out[key], val);
            } else if (val !== undefined) {
              out[key] = GeminiDecisionsRouter._deepClone(val);
            }
          });
          return out;
        }

        static normalizeModelName(model) {
          const s = String(model || "").trim();
          if (!s) return "models/gemini-4-hydrogen";
          return s.startsWith("models/") ? s : `models/${s}`;
        }

        static _getBaseModelCatalog() {
          return {
            "models/gemini-3.5-flash-lite": {
              tier: "lite",
              supportedThinkingLevels: ["MINIMAL", "LOW", "MEDIUM", "HIGH"],
              defaultThinkingLevel: "MEDIUM",
              supportsThinkingBudget: false,
              paidOnly: false,
              notes: "Ultra-low-cost, high-volume Flash-Lite model ($0.30/$2.50 per 1M).",
            },
            "models/gemini-3.8-flash": {
              tier: "fast",
              supportedThinkingLevels: ["LOW", "MEDIUM", "HIGH"],
              defaultThinkingLevel: "MEDIUM",
              supportsThinkingBudget: false,
              paidOnly: false,
              notes: "High-speed Flash workhorse ($0.75/$3.75 thru 2026-12-31, $1.50/$7.50 from 2027-01-01).",
            },
            "models/gemini-4-hydrogen": {
              tier: "workhorse",
              supportedThinkingLevels: ["LOW", "MEDIUM", "HIGH", "XHIGH"],
              defaultThinkingLevel: "HIGH",
              supportsThinkingBudget: false,
              paidOnly: false,
              notes: "Fast, cost-efficient Gemini 4 workhorse ($1.50/$7.50 per 1M, Free tier available).",
            },
            "models/gemini-4-neon": {
              tier: "premium",
              supportedThinkingLevels: ["LOW", "MEDIUM", "HIGH", "XHIGH"],
              defaultThinkingLevel: "HIGH",
              supportsThinkingBudget: false,
              paidOnly: true,
              notes: "Balanced high-efficiency frontier model ($3.00/$15.00 per 1M, Paid only).",
            },
            "models/gemini-4-argon": {
              tier: "frontierFast",
              supportedThinkingLevels: ["LOW", "MEDIUM", "HIGH"],
              defaultThinkingLevel: "MEDIUM",
              supportsThinkingBudget: false,
              paidOnly: true,
              notes: "Fast, lower-thinking-token frontier reasoning model ($4.00/$20.00 from 2026-12-01, Paid only, no XHIGH).",
            },
            "models/gemini-4-carbon": {
              tier: "frontierMax",
              supportedThinkingLevels: ["LOW", "MEDIUM", "HIGH"],
              defaultThinkingLevel: "MEDIUM",
              supportsThinkingBudget: false,
              paidOnly: true,
              notes: "Flagship strongest frontier reasoning model ($4.00/$20.00 from 2026-12-01, Paid only, no XHIGH).",
            },
          };
        }

        static _getBaseModelPool() {
          return {
            lite: "models/gemini-3.5-flash-lite",
            fast: "models/gemini-3.8-flash",
            workhorse: "models/gemini-4-hydrogen",
            premium: "models/gemini-4-neon",
            frontierFast: "models/gemini-4-argon",
            frontierMax: "models/gemini-4-carbon",
          };
        }

        static _getBaseRoutingMatrix() {
          return {
            efficient: {
              trivial: {
                default: { tier: "lite", thinkingLevel: "MINIMAL" },
                withTools: { tier: "lite", thinkingLevel: "LOW" },
                synthesizer: { tier: "lite", thinkingLevel: "MINIMAL" },
              },
              standard: {
                default: { tier: "lite", thinkingLevel: "LOW" },
                withTools: { tier: "fast", thinkingLevel: "LOW" },
                synthesizer: { tier: "lite", thinkingLevel: "LOW" },
                deep: { tier: "workhorse", thinkingLevel: "LOW" },
              },
              complex: {
                default: { tier: "workhorse", thinkingLevel: "LOW" },
                withTools: { tier: "workhorse", thinkingLevel: "LOW" },
                synthesizer: { tier: "workhorse", thinkingLevel: "MEDIUM" },
                deep: { tier: "workhorse", thinkingLevel: "MEDIUM" },
              },
              frontier: {
                default: { tier: "workhorse", thinkingLevel: "MEDIUM" },
                withTools: { tier: "workhorse", thinkingLevel: "MEDIUM" },
                synthesizer: { tier: "frontierFast", thinkingLevel: "HIGH" },
                direct: { tier: "frontierFast", thinkingLevel: "HIGH" },
              },
              max_capability_override: {
                default: { tier: "frontierFast", thinkingLevel: "MEDIUM" },
                withTools: { tier: "frontierFast", thinkingLevel: "MEDIUM" },
                synthesizer: { tier: "frontierMax", thinkingLevel: "MEDIUM" },
                direct: { tier: "frontierMax", thinkingLevel: "MEDIUM" },
              },
            },
            quality: {
              trivial: {
                default: { tier: "workhorse", thinkingLevel: "LOW" },
                withTools: { tier: "workhorse", thinkingLevel: "LOW" },
                synthesizer: { tier: "workhorse", thinkingLevel: "MEDIUM" },
              },
              standard: {
                default: { tier: "workhorse", thinkingLevel: "MEDIUM" },
                withTools: { tier: "workhorse", thinkingLevel: "MEDIUM" },
                synthesizer: { tier: "premium", thinkingLevel: "MEDIUM" },
                direct: { tier: "premium", thinkingLevel: "MEDIUM" },
              },
              complex: {
                default: { tier: "frontierFast", thinkingLevel: "MEDIUM" },
                withTools: { tier: "frontierFast", thinkingLevel: "MEDIUM" },
                synthesizer: { tier: "premium", thinkingLevel: "HIGH" },
                direct: { tier: "frontierFast", thinkingLevel: "HIGH" },
              },
              frontier: {
                default: { tier: "frontierFast", thinkingLevel: "MEDIUM" },
                withTools: { tier: "frontierFast", thinkingLevel: "MEDIUM" },
                synthesizer: { tier: "frontierMax", thinkingLevel: "MEDIUM" },
                direct: { tier: "frontierMax", thinkingLevel: "MEDIUM" },
              },
              max_capability_override: {
                default: { tier: "frontierFast", thinkingLevel: "MEDIUM" },
                withTools: { tier: "frontierFast", thinkingLevel: "MEDIUM" },
                synthesizer: { tier: "frontierMax", thinkingLevel: "MEDIUM" },
                direct: { tier: "frontierMax", thinkingLevel: "MEDIUM" },
              },
            },
          };
        }

        static _getBaseDefaults() {
          return {
            mode: "efficient",
            billingTier: "auto",
            decisionModel: "gemini-decision-1",
            maxInputChars: 3000,
            allowXHighInGas: false,
            respectExplicitThinkingConfig: true,
            allowClientRoutingHints: false,
            cacheEnabled: true,
            logRouting: true,
            maxCapabilityThreshold: 0.65,
            deepThinkingThreshold: 0.65,
          };
        }

        static _ensureRegistry() {
          if (!GeminiDecisionsRouter._registry) {
            GeminiDecisionsRouter._registry = {
              defaults: GeminiDecisionsRouter._getBaseDefaults(),
              modelCatalog: GeminiDecisionsRouter._getBaseModelCatalog(),
              modelPool: GeminiDecisionsRouter._getBaseModelPool(),
              routingMatrix: GeminiDecisionsRouter._getBaseRoutingMatrix(),
            };
          }
          if (!GeminiDecisionsRouter._cache) {
            GeminiDecisionsRouter._cache = new Map();
          }
          if (!GeminiDecisionsRouter._unavailablePaidModels) {
            GeminiDecisionsRouter._unavailablePaidModels = new Set();
          }
          if (GeminiDecisionsRouter._decisionsCircuitOpen === undefined) {
            GeminiDecisionsRouter._decisionsCircuitOpen = false;
          }
        }

        /**
         * Globally registers or updates custom model capability definitions for future models.
         * @param {Object<string, Object>} modelsMap
         */
        static registerModels(modelsMap = {}) {
          GeminiDecisionsRouter._ensureRegistry();
          if (!modelsMap || typeof modelsMap !== "object") return;
          Object.keys(modelsMap).forEach((rawKey) => {
            const normKey = GeminiDecisionsRouter.normalizeModelName(rawKey);
            GeminiDecisionsRouter._registry.modelCatalog[normKey] =
              GeminiDecisionsRouter._deepMerge(
                GeminiDecisionsRouter._registry.modelCatalog[normKey] || {},
                modelsMap[rawKey],
              );
          });
        }

        /**
         * Globally customizes default routing settings, modelCatalog, modelPool, and/or routingMatrix.
         * Accepts the same JSON schema exported by getRoutingConfigSummary().
         * @param {Object} customConfig
         */
        static configureDefaults(customConfig = {}) {
          GeminiDecisionsRouter._ensureRegistry();
          if (!customConfig || typeof customConfig !== "object") return;
          const reg = GeminiDecisionsRouter._registry;
          if (customConfig.modelCatalog) {
            GeminiDecisionsRouter.registerModels(customConfig.modelCatalog);
          }
          if (customConfig.modelPool) {
            Object.keys(customConfig.modelPool).forEach((tier) => {
              if (customConfig.modelPool[tier]) {
                reg.modelPool[tier] = GeminiDecisionsRouter.normalizeModelName(
                  customConfig.modelPool[tier],
                );
              }
            });
          }
          if (customConfig.routingMatrix) {
            reg.routingMatrix = GeminiDecisionsRouter._deepMerge(
              reg.routingMatrix,
              customConfig.routingMatrix,
            );
          }
          const scalarKeys = Object.keys(GeminiDecisionsRouter._getBaseDefaults());
          scalarKeys.forEach((k) => {
            if (customConfig[k] !== undefined) {
              reg.defaults[k] = customConfig[k];
            }
          });
          if (customConfig.activeMode && !customConfig.mode) {
            reg.defaults.mode = customConfig.activeMode;
          }
          GeminiDecisionsRouter._cache.clear();
        }

        /**
         * Resets global registry, cache, and circuit breakers back to built-in defaults.
         */
        static resetDefaults() {
          GeminiDecisionsRouter._registry = null;
          GeminiDecisionsRouter._cache = new Map();
          GeminiDecisionsRouter._unavailablePaidModels = new Set();
          GeminiDecisionsRouter._decisionsCircuitOpen = false;
          GeminiDecisionsRouter._ensureRegistry();
        }

        static markPaidModelUnavailable(model) {
          GeminiDecisionsRouter._ensureRegistry();
          GeminiDecisionsRouter._unavailablePaidModels.add(
            GeminiDecisionsRouter.normalizeModelName(model),
          );
        }

        static isPaidOnlyModel(model, catalog) {
          const norm = GeminiDecisionsRouter.normalizeModelName(model);
          const entry = catalog && catalog[norm];
          return Boolean(entry && entry.paidOnly);
        }

        static normalizeRoutingConfig(rawConfig) {
          GeminiDecisionsRouter._ensureRegistry();
          const reg = GeminiDecisionsRouter._registry;
          const base = {
            ...GeminiDecisionsRouter._deepClone(reg.defaults),
            modelCatalog: GeminiDecisionsRouter._deepClone(reg.modelCatalog),
            modelPool: GeminiDecisionsRouter._deepClone(reg.modelPool),
            routingMatrix: GeminiDecisionsRouter._deepClone(reg.routingMatrix),
          };
          if (rawConfig === undefined || rawConfig === null) {
            return base;
          }
          if (typeof rawConfig === "string") {
            const m = rawConfig.trim().toLowerCase();
            if (m === "fixed" || m === "efficient" || m === "efficiency" || m === "quality" || m === "max_quality") {
              base.mode = m === "efficiency" ? "efficient" : m === "max_quality" ? "quality" : m;
            }
            return base;
          }
          if (typeof rawConfig === "object") {
            const modeRaw = rawConfig.mode || rawConfig.activeMode;
            if (typeof modeRaw === "string") {
              const m = modeRaw.trim().toLowerCase();
              if (m === "fixed" || m === "efficient" || m === "efficiency" || m === "quality" || m === "max_quality") {
                base.mode = m === "efficiency" ? "efficient" : m === "max_quality" ? "quality" : m;
              }
            }
            Object.keys(reg.defaults).forEach((k) => {
              if (k !== "mode" && rawConfig[k] !== undefined) {
                base[k] = rawConfig[k];
              }
            });
            if (rawConfig.modelCatalog && typeof rawConfig.modelCatalog === "object") {
              Object.keys(rawConfig.modelCatalog).forEach((mk) => {
                const normKey = GeminiDecisionsRouter.normalizeModelName(mk);
                base.modelCatalog[normKey] = GeminiDecisionsRouter._deepMerge(
                  base.modelCatalog[normKey] || {},
                  rawConfig.modelCatalog[mk],
                );
              });
            }
            if (rawConfig.modelPool && typeof rawConfig.modelPool === "object") {
              Object.keys(rawConfig.modelPool).forEach((tk) => {
                if (rawConfig.modelPool[tk]) {
                  base.modelPool[tk] = GeminiDecisionsRouter.normalizeModelName(
                    rawConfig.modelPool[tk],
                  );
                }
              });
            }
            if (rawConfig.routingMatrix && typeof rawConfig.routingMatrix === "object") {
              base.routingMatrix = GeminiDecisionsRouter._deepMerge(
                base.routingMatrix,
                rawConfig.routingMatrix,
              );
            }
          }
          return base;
        }

        static getModelCapabilities(model, catalog) {
          const norm = GeminiDecisionsRouter.normalizeModelName(model);
          if (catalog && catalog[norm]) {
            return { ...catalog[norm], registered: true };
          }
          if (/(?:^|\/)gemini-2\.5/i.test(norm)) {
            return {
              tier: "legacy",
              supportedThinkingLevels: [],
              defaultThinkingLevel: null,
              supportsThinkingBudget: true,
              paidOnly: false,
              registered: false,
            };
          }
          if (/(?:^|\/)gemini-(?:2\.0|1\.5|1\.0)/i.test(norm)) {
            return {
              tier: "legacy",
              supportedThinkingLevels: [],
              defaultThinkingLevel: null,
              supportsThinkingBudget: false,
              paidOnly: false,
              registered: false,
            };
          }
          // Safe heuristic for unregistered future Gemini 3/4/5+ models
          return {
            tier: "custom",
            supportedThinkingLevels: ["LOW", "MEDIUM", "HIGH"],
            defaultThinkingLevel: "MEDIUM",
            supportsThinkingBudget: false,
            paidOnly: false,
            registered: false,
          };
        }

        /**
         * Normalizes & clamps thinkingConfig for the target model to prevent HTTP 400 errors.
         */
        static normalizeThinkingConfig(model, desiredLevel, existingGenConfig, catalog, options = {}) {
          const normModel = GeminiDecisionsRouter.normalizeModelName(model);
          const caps = GeminiDecisionsRouter.getModelCapabilities(normModel, catalog);
          const genConfig = existingGenConfig ? GeminiDecisionsRouter._deepClone(existingGenConfig) : {};
          const allowXHighInGas = Boolean(options.allowXHighInGas);

          // Strip Gemini 4+ unsupported generationConfig parameters
          if (/(?:^|\/)gemini-[4-9](?:[-.]|$)/i.test(normModel)) {
            delete genConfig.frequencyPenalty;
            delete genConfig.frequency_penalty;
            delete genConfig.presencePenalty;
            delete genConfig.presence_penalty;
            delete genConfig.candidateCount;
            delete genConfig.candidate_count;
          }

          let level = desiredLevel ? String(desiredLevel).toUpperCase() : null;
          if (!level && genConfig.thinkingConfig && genConfig.thinkingConfig.thinkingLevel) {
            level = String(genConfig.thinkingConfig.thinkingLevel).toUpperCase();
          }

          // Handle models supporting thinkingLevel (Gemini 3 / 3.5 / 3.8 / 4 / future)
          if (caps.supportedThinkingLevels && caps.supportedThinkingLevels.length > 0) {
            const supported = caps.supportedThinkingLevels.map((l) => String(l).toUpperCase());
            if (genConfig.thinkingConfig && genConfig.thinkingConfig.thinkingBudget !== undefined) {
              const oldBudget = genConfig.thinkingConfig.thinkingBudget;
              delete genConfig.thinkingConfig.thinkingBudget;
              if (!level && oldBudget === 0) level = "LOW";
            }
            if (level) {
              if (level === "XHIGH" && !allowXHighInGas) {
                level = "HIGH";
              }
              if (!supported.includes(level)) {
                const order = ["MINIMAL", "LOW", "MEDIUM", "HIGH", "XHIGH"];
                const idx = order.indexOf(level);
                if (idx !== -1) {
                  // Clamp down first, then up if lower not supported (e.g. MINIMAL -> LOW)
                  let resolved = null;
                  for (let i = idx - 1; i >= 0; i--) {
                    if (supported.includes(order[i])) {
                      resolved = order[i];
                      break;
                    }
                  }
                  if (!resolved) {
                    for (let i = idx + 1; i < order.length; i++) {
                      if (supported.includes(order[i])) {
                        resolved = order[i];
                        break;
                      }
                    }
                  }
                  level = resolved || caps.defaultThinkingLevel || supported[0];
                } else {
                  level = caps.defaultThinkingLevel || supported[0];
                }
              }
              genConfig.thinkingConfig = {
                ...(genConfig.thinkingConfig || {}),
                thinkingLevel: level,
              };
            }
            return { generationConfig: genConfig, resolvedThinkingLevel: level || caps.defaultThinkingLevel || null };
          }

          // Handle Gemini 2.5 models (thinkingBudget only)
          if (caps.supportsThinkingBudget) {
            const budgetMap = { MINIMAL: 0, LOW: 1024, MEDIUM: 8192, HIGH: 16384, XHIGH: 24576 };
            if (genConfig.thinkingConfig && genConfig.thinkingConfig.thinkingLevel) {
              delete genConfig.thinkingConfig.thinkingLevel;
            }
            if (level && budgetMap[level] !== undefined) {
              genConfig.thinkingConfig = {
                ...(genConfig.thinkingConfig || {}),
                thinkingBudget: budgetMap[level],
              };
              return { generationConfig: genConfig, resolvedThinkingLevel: `budget:${budgetMap[level]}` };
            }
            return { generationConfig: genConfig, resolvedThinkingLevel: null };
          }

          // Older models without thinkingConfig
          delete genConfig.thinkingConfig;
          return { generationConfig: genConfig, resolvedThinkingLevel: null };
        }

        static _resolveMatrixSlot(matrixForMode, complexity, role, hasTools, deepThinking) {
          const compEntry = (matrixForMode && matrixForMode[complexity]) || (matrixForMode && matrixForMode.standard) || {};
          const roleNorm = String(role || "default").toLowerCase();
          if (roleNorm === "synthesizer" || roleNorm === "a2a_synthesizer" || roleNorm === "mcp_summarizer") {
            if (compEntry.synthesizer) return compEntry.synthesizer;
          }
          if (roleNorm === "direct" && compEntry.direct) {
            return compEntry.direct;
          }
          if (deepThinking && compEntry.deep) {
            return compEntry.deep;
          }
          if (hasTools && compEntry.withTools) {
            return compEntry.withTools;
          }
          return compEntry.default || { tier: "workhorse", thinkingLevel: "LOW" };
        }

        static _applyBillingAndTimeGuards(targetModel, targetLevel, cfg, remainingMs) {
          let model = GeminiDecisionsRouter.normalizeModelName(targetModel);
          let level = targetLevel;
          let guardReason = null;
          const workhorse = GeminiDecisionsRouter.normalizeModelName(
            cfg.modelPool.workhorse || "models/gemini-4-hydrogen",
          );

          // Free-tier or runtime-detected Paid-only downgrade
          const isPaid = GeminiDecisionsRouter.isPaidOnlyModel(model, cfg.modelCatalog);
          if (
            isPaid &&
            (cfg.billingTier === "free" ||
              (cfg.billingTier === "auto" &&
                GeminiDecisionsRouter._unavailablePaidModels.has(model)))
          ) {
            model = workhorse;
            level = level === "MEDIUM" || level === "HIGH" || level === "XHIGH" ? "HIGH" : level;
            guardReason = "free_tier_fallback";
          }

          // GAS 6-minute remaining-time guard (null/NaN safe)
          if (typeof remainingMs === "number" && Number.isFinite(remainingMs) && remainingMs > 0) {
            if (remainingMs < 45000) {
              if (GeminiDecisionsRouter.isPaidOnlyModel(model, cfg.modelCatalog)) {
                model = workhorse;
              }
              if (level === "XHIGH" || level === "HIGH" || level === "MEDIUM") {
                level = "LOW";
              }
              guardReason = guardReason ? `${guardReason}+gas_time_guard_45s` : "gas_time_guard_45s";
            } else if (remainingMs < 90000) {
              if (model === GeminiDecisionsRouter.normalizeModelName(cfg.modelPool.frontierMax)) {
                model = GeminiDecisionsRouter.normalizeModelName(
                  cfg.modelPool.frontierFast || workhorse,
                );
                level = "MEDIUM";
                guardReason = guardReason ? `${guardReason}+gas_time_guard_90s` : "gas_time_guard_90s";
              } else if (level === "XHIGH") {
                level = "HIGH";
                guardReason = guardReason ? `${guardReason}+gas_time_guard_90s` : "gas_time_guard_90s";
              }
            }
          }

          return { model, level, guardReason };
        }

        static buildBoundedInput(prompt, maxInputChars = 3000) {
          const cap = Math.max(256, Number(maxInputChars) || 3000);
          let raw = "";
          if (typeof prompt === "string") {
            raw = prompt;
          } else if (prompt !== null && prompt !== undefined) {
            try {
              raw = JSON.stringify(prompt);
            } catch (_) {
              raw = String(prompt);
            }
          }
          // Strip inline base64 data URIs or long base64 blobs
          raw = raw.replace(/data:[^;\s]+;base64,[A-Za-z0-9+/=]{100,}/g, "[BASE64_OMITTED]");
          raw = raw.replace(/[A-Za-z0-9+/]{512,}={0,2}/g, "[LARGE_BLOB_OMITTED]");
          raw = raw.trim();

          if (raw.length <= cap) {
            return raw || "(empty prompt)";
          }
          const headLen = Math.floor(cap * 0.65);
          const tailLen = Math.max(32, cap - headLen - 20);
          return (
            raw.slice(0, headLen) +
            "\n...[TRUNCATED]...\n" +
            raw.slice(raw.length - tailLen)
          );
        }

        static _buildDecisionsQuestions() {
          return {
            max_capability_override: {
              type: "noul",
              instructions:
                "Does the user prompt explicitly request maximum AI capability, highest possible quality, or deepest thinking (in any language, e.g., 'use maximum capability', 'think as deeply as possible', 'best possible model', '最大の能力で実行', '全力で考えて', '最高精度で')?",
            },
            task_complexity: {
              type: "choice",
              instructions:
                "Classify the reasoning and execution complexity required to answer this prompt accurately.",
              criteria: {
                trivial:
                  "Simple greeting, trivial factual lookup, basic formatting, or single-step extraction.",
                standard:
                  "Routine Q&A, summarization, standard Google Workspace MCP/tool call, or straightforward email/text drafting.",
                complex:
                  "Multi-step analysis, non-trivial coding/debugging, comparative evaluation, or multi-tool orchestration.",
                frontier:
                  "Deep mathematical proof, complex software architecture, security/legal audit, or frontier scientific reasoning.",
              },
            },
            requires_deep_thinking: {
              type: "noul",
              instructions:
                "Does solving this task reliably require multi-step internal reasoning or self-verification?",
            },
          };
        }

        static _normalizeAnswer(raw) {
          const ans = raw || {};
          const noul =
            typeof ans.noul === "number"
              ? ans.noul
              : typeof ans.probability === "number"
                ? ans.probability
                : null;
          const choice =
            typeof ans.choice === "string"
              ? ans.choice
              : typeof ans.selected === "string"
                ? ans.selected
                : typeof ans.value === "string"
                  ? ans.value
                  : null;
          return { noul, choice, confidence: typeof ans.confidence === "number" ? ans.confidence : null };
        }

        static _callDecisionsApi(apiKey, sharedInput, decisionModel) {
          if (typeof UrlFetchApp === "undefined") {
            throw new Error("UrlFetchApp is unavailable in this environment.");
          }
          const payload = {
            model: decisionModel || "gemini-decision-1",
            input: sharedInput,
            questions: GeminiDecisionsRouter._buildDecisionsQuestions(),
          };
          const t0 = Date.now();
          const res = UrlFetchApp.fetch(GeminiDecisionsRouter.DECISIONS_ENDPOINT, {
            method: "post",
            contentType: "application/json",
            headers: { "x-goog-api-key": apiKey },
            payload: JSON.stringify(payload),
            muteHttpExceptions: true,
          });
          const latencyMs = Date.now() - t0;
          const code = res.getResponseCode();
          const rawText = res.getContentText();
          if (code < 200 || code >= 300) {
            const err = new Error(`Decisions API HTTP ${code}: ${String(rawText || "").slice(0, 300)}`);
            err.statusCode = code;
            throw err;
          }
          const body = JSON.parse(rawText);
          const rawAnswers = body.answers || body.decisions || {};
          const usage = body.usage || body.usageMetadata || {};
          const inputTokens =
            typeof usage.totalInputTokens === "number"
              ? usage.totalInputTokens
              : typeof usage.total_input_tokens === "number"
                ? usage.total_input_tokens
                : typeof usage.promptTokenCount === "number"
                  ? usage.promptTokenCount
                  : 0;
          return {
            answers: {
              max_capability_override: GeminiDecisionsRouter._normalizeAnswer(
                rawAnswers.max_capability_override,
              ),
              task_complexity: GeminiDecisionsRouter._normalizeAnswer(
                rawAnswers.task_complexity,
              ),
              requires_deep_thinking: GeminiDecisionsRouter._normalizeAnswer(
                rawAnswers.requires_deep_thinking,
              ),
            },
            inputTokens,
            latencyMs,
          };
        }

        static _hashString(str) {
          let h = 2166136261;
          for (let i = 0; i < str.length; i++) {
            h ^= str.charCodeAt(i);
            h = Math.imul(h, 16777619);
          }
          return (h >>> 0).toString(16);
        }

        static formatLogMessage(decision) {
          const d = decision || {};
          const agentPart = d.agent ? `agent=${d.agent} | ` : "";
          const thinkLabel = d.thinkingLevel || "default";
          const msPart =
            typeof d.decisionsLatencyMs === "number" && d.decisionsLatencyMs >= 0
              ? ` (decisions=${d.decisionsLatencyMs}ms)`
              : "";
          return `[ModelRouting] ${agentPart}role=${d.role || "default"} | mode=${d.mode || "fixed"} | model=${d.model} | thinking=${thinkLabel} | reason=${d.reason || "configured"}${msPart}`;
        }

        /**
         * Resolves model & thinkingConfig for a generation call.
         * Always fails open to configuredModel on any auth/network/API error.
         */
        static route(params = {}) {
          GeminiDecisionsRouter._ensureRegistry();
          const cfg = GeminiDecisionsRouter.normalizeRoutingConfig(params.modelRouting);
          const agentName = params.agentName || null;
          const role = params.role || "default";
          const hasTools = Boolean(params.hasTools);
          const configuredModel = GeminiDecisionsRouter.normalizeModelName(
            params.configuredModel || "models/gemini-4-hydrogen",
          );
          const existingGenConfig = params.configuredGenerationConfig || null;
          const hasExplicitThinking = Boolean(
            existingGenConfig &&
              existingGenConfig.thinkingConfig &&
              (existingGenConfig.thinkingConfig.thinkingLevel !== undefined ||
                existingGenConfig.thinkingConfig.thinkingBudget !== undefined),
          );

          const emitAndReturn = (model, generationConfig, decision) => {
            if (cfg.logRouting !== false) {
              const msg = GeminiDecisionsRouter.formatLogMessage(decision);
              if (typeof params.onLog === "function") {
                params.onLog(msg, decision);
              } else if (params.consoleLogFallback && typeof console !== "undefined") {
                console.log(msg);
              }
            }
            return { model, generationConfig, routingDecision: decision };
          };

          // Mode: fixed -> zero Decisions API calls
          if (cfg.mode === "fixed") {
            const norm = GeminiDecisionsRouter.normalizeThinkingConfig(
              configuredModel,
              null,
              existingGenConfig,
              cfg.modelCatalog,
              { allowXHighInGas: cfg.allowXHighInGas },
            );
            return emitAndReturn(configuredModel, norm.generationConfig, {
              agent: agentName,
              role,
              mode: "fixed",
              model: configuredModel,
              thinkingLevel: norm.resolvedThinkingLevel,
              thinkingConfig: norm.generationConfig.thinkingConfig || null,
              complexity: null,
              maxCapabilityOverride: false,
              decisionsLatencyMs: null,
              decisionsInputTokens: 0,
              reason: "fixed_mode",
              fallbackReason: null,
            });
          }

          // Fail-open if apiKey absent (OAuth-only) or circuit breaker tripped
          if (!params.apiKey || GeminiDecisionsRouter._decisionsCircuitOpen) {
            const fallbackReason = !params.apiKey ? "missing_api_key_oauth_only" : "decisions_circuit_open";
            const norm = GeminiDecisionsRouter.normalizeThinkingConfig(
              configuredModel,
              null,
              existingGenConfig,
              cfg.modelCatalog,
              { allowXHighInGas: cfg.allowXHighInGas },
            );
            return emitAndReturn(configuredModel, norm.generationConfig, {
              agent: agentName,
              role,
              mode: cfg.mode,
              model: configuredModel,
              thinkingLevel: norm.resolvedThinkingLevel,
              thinkingConfig: norm.generationConfig.thinkingConfig || null,
              complexity: null,
              maxCapabilityOverride: Boolean(params.forceMaxCapability),
              decisionsLatencyMs: null,
              decisionsInputTokens: 0,
              reason: `fallback:${fallbackReason}`,
              fallbackReason,
            });
          }

          const boundedInput = GeminiDecisionsRouter.buildBoundedInput(
            params.prompt,
            cfg.maxInputChars,
          );
          // Key Decisions evaluation cache strictly by (decisionModel, promptHash) so
          // Planner -> Synthesizer and previewModelRouting() reuse a single Decisions API call.
          const cacheKey = `${cfg.decisionModel}|${GeminiDecisionsRouter._hashString(boundedInput)}`;

          let evalResult = null;
          let cacheHit = false;
          if (cfg.cacheEnabled && GeminiDecisionsRouter._cache.has(cacheKey)) {
            evalResult = GeminiDecisionsRouter._cache.get(cacheKey);
            cacheHit = true;
          } else {
            try {
              evalResult = GeminiDecisionsRouter._callDecisionsApi(
                params.apiKey,
                boundedInput,
                cfg.decisionModel,
              );
              if (cfg.cacheEnabled) {
                GeminiDecisionsRouter._cache.set(cacheKey, evalResult);
              }
            } catch (err) {
              if (err && (err.statusCode === 401 || err.statusCode === 403 || err.statusCode === 404)) {
                GeminiDecisionsRouter._decisionsCircuitOpen = true;
              }
              const norm = GeminiDecisionsRouter.normalizeThinkingConfig(
                configuredModel,
                null,
                existingGenConfig,
                cfg.modelCatalog,
                { allowXHighInGas: cfg.allowXHighInGas },
              );
              return emitAndReturn(configuredModel, norm.generationConfig, {
                agent: agentName,
                role,
                mode: cfg.mode,
                model: configuredModel,
                thinkingLevel: norm.resolvedThinkingLevel,
                thinkingConfig: norm.generationConfig.thinkingConfig || null,
                complexity: null,
                maxCapabilityOverride: Boolean(params.forceMaxCapability),
                decisionsLatencyMs: null,
                decisionsInputTokens: 0,
                reason: "fallback:decisions_api_error",
                fallbackReason: err.message,
              });
            }
          }

          const maxCapProb = evalResult.answers.max_capability_override.noul || 0;
          const deepProb = evalResult.answers.requires_deep_thinking.noul || 0;
          const maxCapOverride =
            Boolean(params.forceMaxCapability) || maxCapProb >= cfg.maxCapabilityThreshold;
          const rawComplexity = evalResult.answers.task_complexity.choice || "standard";
          const effectiveComplexity = maxCapOverride ? "max_capability_override" : rawComplexity;
          const deepThinking = deepProb >= cfg.deepThinkingThreshold;

          const matrixForMode = cfg.routingMatrix[cfg.mode] || cfg.routingMatrix.efficient;
          const slot = GeminiDecisionsRouter._resolveMatrixSlot(
            matrixForMode,
            effectiveComplexity,
            role,
            hasTools,
            deepThinking,
          );
          const pooledModel =
            (slot.model && GeminiDecisionsRouter.normalizeModelName(slot.model)) ||
            cfg.modelPool[slot.tier] ||
            configuredModel;

          const guarded = GeminiDecisionsRouter._applyBillingAndTimeGuards(
            pooledModel,
            slot.thinkingLevel,
            cfg,
            params.remainingMs,
          );

          const desiredLevel =
            hasExplicitThinking && cfg.respectExplicitThinkingConfig && !maxCapOverride
              ? null
              : guarded.level;

          const norm = GeminiDecisionsRouter.normalizeThinkingConfig(
            guarded.model,
            desiredLevel,
            existingGenConfig,
            cfg.modelCatalog,
            { allowXHighInGas: cfg.allowXHighInGas },
          );

          let reason = maxCapOverride
            ? "max_capability_override"
            : `task_complexity:${rawComplexity}${deepThinking ? "+deep" : ""}`;
          if (guarded.guardReason) reason += ` (${guarded.guardReason})`;
          if (cacheHit) reason += " [cached]";

          return emitAndReturn(guarded.model, norm.generationConfig, {
            agent: agentName,
            role,
            mode: cfg.mode,
            model: guarded.model,
            thinkingLevel: norm.resolvedThinkingLevel,
            thinkingConfig: norm.generationConfig.thinkingConfig || null,
            complexity: rawComplexity,
            maxCapabilityOverride: maxCapOverride,
            decisionsLatencyMs: cacheHit ? 0 : evalResult.latencyMs,
            decisionsInputTokens: cacheHit ? 0 : evalResult.inputTokens,
            reason,
            fallbackReason: null,
          });
        }

        /**
         * Exports a clean, zero-secret JSON comparison of current routing settings
         * across fixed, efficient, and quality modes (0 API calls).
         */
        static getRoutingConfigSummary(customConfig = null, context = {}) {
          const cfg = GeminiDecisionsRouter.normalizeRoutingConfig(customConfig);
          const configuredModel = GeminiDecisionsRouter.normalizeModelName(
            context.configuredModel || "models/gemini-4-hydrogen",
          );
          const configuredGenConfig = context.configuredGenerationConfig || null;
          const warnings = [];
          const complexities = [
            "trivial",
            "standard",
            "complex",
            "frontier",
            "max_capability_override",
          ];
          const roles = ["default", "withTools", "synthesizer", "direct"];

          // Validate modelPool against modelCatalog
          Object.keys(cfg.modelPool).forEach((tier) => {
            const m = GeminiDecisionsRouter.normalizeModelName(cfg.modelPool[tier]);
            if (!cfg.modelCatalog[m]) {
              warnings.push(`Unregistered model '${m}' in modelPool.${tier}; heuristic thinking rules will apply.`);
            }
          });

          const fixedNorm = GeminiDecisionsRouter.normalizeThinkingConfig(
            configuredModel,
            null,
            configuredGenConfig,
            cfg.modelCatalog,
            { allowXHighInGas: cfg.allowXHighInGas },
          );

          const buildModeTable = (modeName) => {
            if (modeName === "fixed") {
              return {
                usesDecisionsApi: false,
                model: configuredModel,
                thinkingLevel: fixedNorm.resolvedThinkingLevel,
                thinkingConfig: fixedNorm.generationConfig.thinkingConfig || null,
              };
            }
            const table = { usesDecisionsApi: true, decisionModel: cfg.decisionModel, routes: {} };
            const mat = cfg.routingMatrix[modeName] || {};
            complexities.forEach((comp) => {
              table.routes[comp] = {};
              roles.forEach((r) => {
                const slot = GeminiDecisionsRouter._resolveMatrixSlot(
                  mat,
                  comp,
                  r === "withTools" ? "default" : r,
                  r === "withTools",
                  false,
                );
                const rawModel =
                  (slot.model && GeminiDecisionsRouter.normalizeModelName(slot.model)) ||
                  cfg.modelPool[slot.tier] ||
                  configuredModel;
                const guarded = GeminiDecisionsRouter._applyBillingAndTimeGuards(
                  rawModel,
                  slot.thinkingLevel,
                  cfg,
                  null,
                );
                const norm = GeminiDecisionsRouter.normalizeThinkingConfig(
                  guarded.model,
                  guarded.level,
                  null,
                  cfg.modelCatalog,
                  { allowXHighInGas: cfg.allowXHighInGas },
                );
                if (slot.thinkingLevel && norm.resolvedThinkingLevel && String(slot.thinkingLevel).toUpperCase() !== String(norm.resolvedThinkingLevel).toUpperCase()) {
                  warnings.push(
                    `${modeName}.${comp}.${r}: clamped thinkingLevel '${slot.thinkingLevel}' -> '${norm.resolvedThinkingLevel}' for ${guarded.model}`,
                  );
                }
                table.routes[comp][r] = {
                  tier: slot.tier || "custom",
                  model: guarded.model,
                  thinkingLevel: norm.resolvedThinkingLevel,
                  paidOnly: GeminiDecisionsRouter.isPaidOnlyModel(guarded.model, cfg.modelCatalog),
                };
              });
            });
            return table;
          };

          return {
            version: GeminiDecisionsRouter.VERSION,
            activeMode: cfg.mode,
            configuredModel,
            configuredGenerationConfig: configuredGenConfig
              ? GeminiDecisionsRouter._deepClone(configuredGenConfig)
              : null,
            billingTier: cfg.billingTier,
            decisionModel: cfg.decisionModel,
            allowXHighInGas: cfg.allowXHighInGas,
            maxInputChars: cfg.maxInputChars,
            respectExplicitThinkingConfig: cfg.respectExplicitThinkingConfig,
            logRouting: cfg.logRouting,
            modelPool: GeminiDecisionsRouter._deepClone(cfg.modelPool),
            modelCatalog: GeminiDecisionsRouter._deepClone(cfg.modelCatalog),
            routingMatrix: GeminiDecisionsRouter._deepClone(cfg.routingMatrix),
            modeComparison: {
              fixed: buildModeTable("fixed"),
              efficient: buildModeTable("efficient"),
              quality: buildModeTable("quality"),
            },
            warnings: Array.from(new Set(warnings)),
          };
        }

        /**
         * Dry-run preview: calls Decisions API once for a prompt and compares what
         * fixed, efficient, and quality modes would choose without executing generateContent.
         */
        static previewRouting(params = {}) {
          const baseCfg = GeminiDecisionsRouter.normalizeRoutingConfig(params.modelRouting);
          const role = params.role || "direct";
          const hasTools = Boolean(params.hasTools);
          const configuredModel = GeminiDecisionsRouter.normalizeModelName(
            params.configuredModel || "models/gemini-4-hydrogen",
          );

          const fixedRes = GeminiDecisionsRouter.route({
            ...params,
            modelRouting: { ...baseCfg, mode: "fixed", logRouting: false },
          });
          const effRes = GeminiDecisionsRouter.route({
            ...params,
            modelRouting: { ...baseCfg, mode: "efficient", logRouting: false },
          });
          const qualRes = GeminiDecisionsRouter.route({
            ...params,
            modelRouting: { ...baseCfg, mode: "quality", logRouting: false },
          });

          return {
            version: GeminiDecisionsRouter.VERSION,
            role,
            hasTools,
            configuredModel,
            activeMode: baseCfg.mode,
            comparison: {
              fixed: fixedRes.routingDecision,
              efficient: effRes.routingDecision,
              quality: qualRes.routingDecision,
            },
          };
        }
      };
