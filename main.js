/**
 * GitHub  https://github.com/tanaikech/GeminiWithFiles<br>
 * Library name
 * @type {string}
 * @const {string}
 * @readonly
 */
var appName = "GeminiWithFiles";

/**
 * Main Class
 * 
 * ### Usage 
 * ```
 * {Object} object API key or access token for using Gemini API.
 * {String} object.apiKey API key.
 * {String} object.accessToken Access token.
 * {String} object.model Model. Default is "models/gemini-2.5-flash".
 * {String} object.version Version of API. Default is "v1beta".
 * {Boolean} object.doCountToken Default is false. If this is true, when Gemini API is requested, the token of request is shown in the log.
 * {Array} object.history History for continuing chat.
 * {Array} object.functions If you want to give the custom functions, please use this.
 * {String} object.response_mime_type In the current stage, only "application/json" can be used.
 * {String} object.responseMimeType In the current stage, only "application/json" can be used.
 * {Object} object.response_schema JSON schema for controlling the output format. For OpenAPI schema. https://spec.openapis.org/oas/v3.0.3#schema
 * {Object} object.responseSchema JSON schema for controlling the output format. For OpenAPI schema. https://spec.openapis.org/oas/v3.0.3#schema
 * {Object} object.response_json_schema JSON schema for controlling the output format. For JSON Schema. https://json-schema.org/
 * {Object} object.responseJsonSchema JSON schema for controlling the output format. For JSON Schema. https://json-schema.org/
 * {Number} object.temperature Control the randomness of the output.
 * {Object} object.systemInstruction Ref: https://cloud.google.com/vertex-ai/generative-ai/docs/model-reference/gemini.
 * {Boolean} object.exportTotalTokens When this is true, the total tokens are exported as the result value. At that time, the generated content and the total tokens are returned as an object.
 * {Boolean} object.exportRawData The default value is false. When this is true, the raw data returned from Gemini API is returned.
 * {Object} object.toolConfig The default is null. If you want to directly give the object of "toolConfig", please use this.
 * {Array} object.tools The default value is null. For example, when you want to use "codeExecution", please set `tools: [{ codeExecution: {}}]`.
 * {PropertiesService.Properties} object.propertiesService PropertiesService.getScriptProperties()
 * {Boolean} object.resumableUploadAsNewUpload When you want to upload the data with the resumable upload as new upload, please set this as true. The default is false.
 * {Object} object.generationConfig The default is {}. The properties of GenerationConfig can be seen at https://ai.google.dev/api/generate-content#v1beta.GenerationConfig
 * ```
 * 
 * @param {Object} object API key or access token for using Gemini API.
 * @returns {GeminiWithFiles}
 */
function geminiWithFiles(object) {
  this.geminiWithFiles = new GeminiWithFiles(object);
  return this.geminiWithFiles;
}

/**
 * ### Description
 * Set file IDs.
 *
 * @param {Array} fileIds File IDs on Google Drive for uploading to Gemini.
 * @param {Boolean} asImage Default is false. If this is true, all files are used as the thumbnail images.
 * @returns {GeminiWithFiles}.
 */
function setFileIds(fileIds, asImage = false) {
  this.geminiWithFiles.setFileIds(fileIds, asImage);
  return this.geminiWithFiles;
}

/**
 * ### Description
 * Set blobs.
 *
 * @param {Blob[]} blobs Blobs for uploading to Gemini.
 * @param {Boolean} pdfAsImage Default is false. If this is true, when the blob is PDF data, each page is converted to image data.
 * @returns {GeminiWithFiles}.
 */
function setBlobs(blobs, pdfAsImage = false) {
  this.geminiWithFiles.setBlobs(blobs, pdfAsImage);
  return this.geminiWithFiles;
}

/**
 * ### Description
 * Upload data (files) to Gemini with resumable upload.
 * In this case, you can use the file ID on Google Drive and the URL of the direct link of the file.
 *
 * @param {Array} array Array including the file IDs or URLs for uploading to Gemini.
 * @returns {GeminiWithFiles}.
 */
function setFileIdsOrUrlsWithResumableUpload(array) {
  this.geminiWithFiles.setFileIdsOrUrlsWithResumableUpload(array);
  return this.geminiWithFiles;
}

/**
 * ### Description
 * Create object for using the generateContent method.
 * 
 * @param {Array} fileList File list from the uploadFiles and getFileList method.
 * @returns {GeminiWithFiles}
 */
function withUploadedFilesByGenerateContent(fileList = []) {
  this.geminiWithFiles.withUploadedFilesByGenerateContent(fileList);
  return this.geminiWithFiles;
}


/**
 * ### Description
 * Upload files to Gemini.
 *
 * @param {Number} n Number of concurrent upload to Gemini. Default value is 50.
 * @returns {Object} Returned object from Gemini.
 */
function uploadFiles(n = 50) {
  return this.geminiWithFiles.uploadFiles(n);
}

/**
 * ### Description
 * Get file list in Gemini.
 * 
 * @returns {Array} File list.
 */
function getFileList() {
  return this.geminiWithFiles.getFileList();
}

/**
 * ### Description
 * Delete files from Gemini.
 *
 * @param {Array} names Array including names of the files on Gemini.
 * @param {Number} n Number of concurrent delete files. Default value is 50.
 * @returns {Array} Array including response values. When the delete is successed, no response is returned.
 */
function deleteFiles(names, n = 50) {
  return this.geminiWithFiles.deleteFiles(names, n);
}

/**
 * ### Description
 * Main method.
 *
 * @param {Object} object Object using Gemini API.
 * @param {String} object.q Input text.
 * @returns {(String|Number|Array|Object|Boolean)} Output value.
 */
function generateContent(object) {
  return this.geminiWithFiles.generateContent(object);
}

/**
 * Development suspended on 20250722
 * ref: https://issuetracker.google.com/issues/431365432
 */
// /**
//  * ### Description
//  * This method is used for generating content by the batch requests.
//  * ref: https://ai.google.dev/gemini-api/docs/batch-mode
//  * 
//  * @param {Object} obj Object for generating content by the batch requests.
//  * @return {Object} Response value as an object.
//  */
// function batchGenerateContent(object) {
//   return this.geminiWithFiles.batchGenerateContent(object);
// }

/**
 * ### Description
 * Method for generating content with the chat.
 *
 * @param {Object} object Object for chat with Gemini API.
 * @returns {Object} Output value.
 */
function chat(object) {
  return this.geminiWithFiles.chat(object);
}

/**
 * ### Description
 * Method for counting tokens of the request.
 *
 * @param {Object} object Object for chat with Gemini API.
 * @returns {Object} Output value.
 */
function countTokens(object) {
  return this.geminiWithFiles.countTokens(object);
}
