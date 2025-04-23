# GeminiWithFiles

<a name="top"></a>
[![MIT License](http://img.shields.io/badge/license-MIT-blue.svg?style=flat)](LICENCE)

# IMPORTANT
Gemini API is continuing to grow. On August 5, 2024, I largely updated GeminiWithFiles to v2.x.x. With this large update, the version is changed from v1 to v2.

If you want to use GeminiWithFiles v1.x.x, please see [here](old_v1.x.x/README.md).

<a name="overview"></a>

![](images/fig1.jpg)

# Overview

This is a Google Apps Script library for Gemini API with files.

A new Google Apps Script library called GeminiWithFiles simplifies using Gemini, a large language model, to process unstructured data like images and PDFs. GeminiWithFiles can upload files, generate content, and create descriptions from multiple images at once. This significantly reduces workload and expands possibilities for using Gemini.

# Description

Recently, Gemini, a large language model from Google AI, has brought new possibilities to various tasks by enabling the use of unstructured data as structured data. This is particularly significant because a vast amount of information exists in unstructured formats like text documents, images, and videos.

Gemini 1.5 API, released recently, significantly expands these capabilities. It can generate content by up to 1 million tokens, a substantial increase compared to previous versions. Additionally, Gemini 1.5 can now process up to 3,000 image files, vastly exceeding the 16-image limit of Gemini 1.0. [Ref](https://ai.google.dev/gemini-api/docs/prompting_with_media?hl=en#supported_file_formats)

While Gemini cannot directly work with Google Drive formats like Docs, Sheets, and Slides, there are workarounds. In the current stage, PDF data can be directly processed with Gemini API. Using this, those Google Docs files are converted to PDF and used with Gemini API. [Ref](https://medium.com/google-cloud/gemini-api-revolutionizing-content-generation-with-direct-pdf-input-105493780fa4)

This report introduces a new Google Apps Script library called "GeminiWithFiles" that simplifies this process. GeminiWithFiles allows users to easily upload files and generate content using Gemini's powerful capabilities. It also enables efficient description creation from multiple images with a single API call, significantly reducing the workload compared to processing each image individually as demonstrated in my prior report. [Ref](https://medium.com/google-cloud/automatically-creating-descriptions-of-files-on-google-drive-using-gemini-pro-api-with-google-apps-7ef597a5b9fb)

By streamlining the process and expanding capabilities, GeminiWithFiles holds promise for various use cases across different domains. This report serves as an extended approach to the previous one, aiming to further reduce process costs and improve efficiency when working with Gemini and unstructured data.

# Origins of this library

I created this library based on the following reports.

- [Automatically Creating Descriptions of Files on Google Drive using Gemini Pro API with Google Apps Script](https://medium.com/google-cloud/automatically-creating-descriptions-of-files-on-google-drive-using-gemini-pro-api-with-google-apps-7ef597a5b9fb)
- [Categorization using Gemini Pro API with Google Apps Script](https://medium.com/google-cloud/categorization-using-gemini-pro-api-with-google-apps-script-804df0101161)
- [Guide to Function Calling with Gemini and Google Apps Script](https://medium.com/google-cloud/guide-to-function-calling-with-gemini-and-google-apps-script-0e058d472f45)
- [Creating Image Bot using Gemini with Google Apps Script](https://medium.com/google-cloud/creating-image-bot-using-gemini-with-google-apps-script-51457cce03d7)
- [Crafting Bespoke Output Formats with Gemini API](https://medium.com/google-cloud/crafting-bespoke-output-formats-with-gemini-api-087b029d84d5)
- [Generating Texts using Files Uploaded by Gemini 1.5 API](https://medium.com/google-cloud/generating-texts-using-files-uploaded-by-gemini-1-5-api-5777f1c902ab)
- [Specifying Output Types for Gemini API with Google Apps Script](https://medium.com/google-cloud/specifying-output-types-for-gemini-api-with-google-apps-script-c2f6a753c8d7)
- [Parsing Invoices using Gemini 1.5 API with Google Apps Script](https://medium.com/google-cloud/parsing-invoices-using-gemini-1-5-api-with-google-apps-script-1f32af1678f2)
- [Taming the Wild Output: Effective Control of Gemini API Response Formats with response_mime_type](https://medium.com/google-cloud/taming-the-wild-output-effective-control-of-gemini-api-response-formats-with-response-mime-type-da273c08be85)
- [Gemini API with JSON schema](https://medium.com/google-cloud/gemini-api-with-json-schema-3dbdabac7d19)
- [Taming the Wild Output: Effective Control of Gemini API Response Formats with response_schema](https://medium.com/google-cloud/taming-the-wild-output-effective-control-of-gemini-api-response-formats-with-response-schema-ae0097b97502)
- [Harnessing Gemini’s Power: A Guide to Generating Content from Structured Data](https://medium.com/google-cloud/harnessing-geminis-power-a-guide-to-generating-content-from-structured-data-45080dac0bbb)

# Features

This library GeminiWithFiles allows you to interact with Gemini, a powerful document processing and management platform, through an easy-to-use API. Here's what you can achieve with this library:

File Management:

- Upload files to Gemini for storage and future processing with an asynchronous process.
- Retrieve a list of files currently stored in your Gemini account.
- Delete files from your Gemini account with an asynchronous process.

Content Upload:

- Upload various file formats including Google Docs (Documents, Spreadsheets, Slides), and PDFs. In the current stage, PDF data can be directly used. [Ref](https://medium.com/google-cloud/gemini-api-revolutionizing-content-generation-with-direct-pdf-input-105493780fa4)

Chat History Management:

- Save your chat history for later analysis or retrieval.

Content Generation:

- Process multiple files at once (e.g., images, papers, invoices) using a single API call to generate new content based on the uploaded data.

Output Specification:

- Specify the desired output format for the results generated by the Gemini API.

- Using `response_mime_type` and JSON schema, the output format is controlled. [Ref](https://medium.com/google-cloud/taming-the-wild-output-effective-control-of-gemini-api-response-formats-with-response-mime-type-da273c08be85)

# Features

# Usage

In order to test this script, please do the following steps.

## 1. Create an API key

Please access [https://makersuite.google.com/app/apikey](https://makersuite.google.com/app/apikey) and create your API key. At that time, please enable Generative Language API at the API console. This API key is used for this sample script.

This official document can also be seen. [Ref](https://ai.google.dev/).

## 2. Create a Google Apps Script project

Please create a standalone Google Apps Script project. Of course, this script can also be used with the container-bound script.

And, please open the script editor of the Google Apps Script project.

## 3. How to use GeminiWithFiles

There are 2 patterns for using GeminiWithFiles.

### 1. Use GeminiWithFiles as a Google Apps Script library

If you use this library as a Google Apps Script library, please install the library to your Google Apps Script project as follows.

1. Create a Google Apps Script project. Or, open your Google Apps Script project.

   - You can use this library for the Google Apps Script project of both the standalone and container-bound script types.

2. [Install this library](https://developers.google.com/apps-script/guides/libraries).

   - The library's project key is as follows.

```
1dolXnIeXKz-BH1BlwRDaKhzC2smJcGyVxMxGYhaY2kqiLa857odLXrIC
```

### 2. Use GeminiWithFiles in your own Google Apps Script project

If you use this library in your own Google Apps Script project, please copy and paste the script ["classGeminiWithFiles.js"](https://github.com/tanaikech/GeminiWithFiles/blob/master/classGeminiWithFiles.js) into your Google Apps Script project. By this, the script can be used.

"main.js" is used for the Google Apps Script library. So, in this pattern, you are not required to use it.

# Scopes

This library uses the following 2 scopes.

- `https://www.googleapis.com/auth/script.external_request`
- `https://www.googleapis.com/auth/drive`

If you want to use the access token, please link the Google Cloud Platform Project to the Google Apps Script Project. And, please add the following scope.

- `https://www.googleapis.com/auth/generative-language`

Also, you can see the official document of Gemini API at [https://ai.google.dev/api/rest](https://ai.google.dev/api/rest).

# Methods

| Methods                                                                                  | Description                                         |
| :--------------------------------------------------------------------------------------- | :-------------------------------------------------- |
| [setFileIds(fileIds, asImage = false)](#setfileIds)                                      | Set file IDs.                                       |
| [setBlobs(blobs)](#setblobs)                                         | Set blobs.                                          |
| [withUploadedFilesByGenerateContent(fileList = [])](#withuploadedfilesbygeneratecontent) | Create object for using the generateContent method. |
| [uploadFiles(n = 50)](#uploadfiles)                                                      | Upload files to Gemini.                             |
| [getFileList()](#getfilelist)                                                            | Get file list in Gemini.                            |
| [deleteFiles(names, n = 50)](#deletefiles)                                               | Delete files from Gemini.                           |
| [generateContent(object)](#generatecontent)                                              | Main method. Generate content by Gemini API.        |
| [setFileIdsOrUrlsWithResumableUpload(object)](#setfileidsorurlsWithresumableupload) | File over 50 MB can be uploaded to Gemini. |
| [chat(object)](#chat) | When this method is used, you can generate content with Gemini API through the chat. |
| [countTokens(object)](#counttokens) | Count tokens. |

## Constructor

When you install GeminiWithFiles as a library to your Google Apps Script project, please use the following script.

```javascript
const g = GeminiWithFiles.geminiWithFiles(object);
```

or

When you directly copy and paste the script of Class GeminiWithFiles into your Google Apps Script project, please use the following script.

```javascript
const g = new GeminiWithFiles(object);
```

The value of `object` is as follows.

````
{Object} object API key or access token for using Gemini API.
{String} object.apiKey API key.
{String} object.accessToken Access token.
{String} object.model Model. Default is "models/gemini-1.5-pro-latest".
{String} object.version Version of API. Default is "v1beta".
{Boolean} object.doCountToken Default is false. If this is true, when Gemini API is requested, the token of request is shown in the log.
{Array} object.history History for continuing chat.
{Array} object.functions If you want to give the custom functions, please use this.
{String} object.response_mime_type In the current stage, only "application/json" can be used.
{String} object.responseMimeType In the current stage, only "application/json" can be used.
{Object} object.response_schema JSON schema for controlling the output format.
{Object} object.responseSchema JSON schema for controlling the output format.
{Number} object.temperature Control the randomness of the output.
{Object} object.systemInstruction Ref: https://cloud.google.com/vertex-ai/generative-ai/docs/model-reference/gemini.
{Boolean} object.exportTotalTokens When this is true, the total tokens are exported as the result value. At that time, the generated content and the total tokens are returned as an object.
{Boolean} object.exportRawData The default value is false. When this is true, the raw data returned from Gemini API is returned.
{Object} object.toolConfig The default is null. If you want to directly give the object of "toolConfig", please use this.
{Array} object.tools The default value is null. For example, when you want to use "codeExecution", please set `tools: [{ codeExecution: {}}]`.
{PropertiesService.Properties} object.propertiesService PropertiesService.getScriptProperties()
{Boolean} object.resumableUploadAsNewUpload When you want to upload the data with the resumable upload as new upload, please set this as true. The default is false.
{Object} object.generationConfig The default is {}. When you use the specific prpperties of response_mime_type, response_schema, and temperature, those are used to generationConfig.
````

- When you want to use `response_mime_type`, please give `jsonSchema` to generateContent method. In the current stage, only `"application/json"` can be used to `response_mime_type`.

- When you want to use `systemInstruction`, please confirm the official document [Ref](https://cloud.google.com/vertex-ai/generative-ai/docs/model-reference/gemini).

- Gemini 1.5 Flash Latest (`models/gemini-1.5-flash-latest`) is used as the default model. When you want to use Gemini 1.5 Pro Latest (`models/gemini-1.5-pro-latest`), please use it like `const g = GeminiWithFiles.geminiWithFiles({ apiKey, model: "models/gemini-1.5-pro-latest" })`.

- In the current stage, when `response_schema` is used, `response_mime_type: "application/json"` is automatically used.

<a name="setfileIds"></a>

## setFileIds

Set file IDs. The files of file IDs are uploaded to Gemini.

In this case, async/await is used in the function.

```javascript
function myFunction() {
  const apiKey = "###"; // Please set your API key.
  const folderId = "###"; // Please set your folder ID including images.

  let fileIds = [];
  const files = DriveApp.getFolderById(folderId).getFiles();
  while (files.hasNext()) {
    const file = files.next();
    fileIds.push(file.getId());
  }

  const g = GeminiWithFiles.geminiWithFiles({ apiKey }); // This is for installing GeminiWithFiles as a library.
  // const g = new GeminiWithFiles({ apiKey }); // This is for directly copying and pasting Class GeminiWithFiles into your Google Apps Script project.

  const res = g.setFileIds(fileIds, false).uploadFiles();
  console.log(res);
}
```

- The 1st and 2nd arguments of `setFileIds` are String[] (the file IDs on Google Drive) and the boolean, respectively. If the 2nd argument is false, the inputted files of file IDs are uploaded as raw data. If the 2nd argument is true, the inputted files of file IDs are converted to image data and are uploaded. The default of 2nd argument is false.
- After July 23, 2024, PDF data can be directly used with Gemini API. So, in the current stage, when you use PDF data, you can use `false` at this method like `setFileIds(fileIds, false)`.

<a name="setblobs"></a>

## setBlobs

Set blobs. The blobs are uploaded to Gemini.

```javascript
function myFunction() {
  const apiKey = "###"; // Please set your API key.
  const folderId = "###"; // Please set your folder ID including images.

  const blobs = [];
  const files = DriveApp.getFolderById(folderId).getFiles();
  while (files.hasNext()) {
    blobs.push(files.next().getBlob());
  }

  const g = GeminiWithFiles.geminiWithFiles({ apiKey }); // This is for installing GeminiWithFiles as a library.
  // const g = new GeminiWithFiles({ apiKey }); // This is for directly copying and pasting Class GeminiWithFiles into your Google Apps Script project.

  const res = g.setBlobs(blobs).uploadFiles();
  console.log(res);
}
```

- The 1st argument of `setBlobs` is Blob[].
- In this method, the data conversion cannot be used.

<a name="withuploadedfilesbygeneratecontent"></a>

## withUploadedFilesByGenerateContent

Create object for using the generateContent method.

```javascript
function myFunction() {
  const apiKey = "###"; // Please set your API key.
  const q = "###"; // Please set your question.

  const g = GeminiWithFiles.geminiWithFiles({ apiKey }); // This is for installing GeminiWithFiles as a library.
  // const g = new GeminiWithFiles({ apiKey }); // This is for directly copying and pasting Class GeminiWithFiles into your Google Apps Script project.

  const fileList = g.getFileList();
  const res = g
    .withUploadedFilesByGenerateContent(fileList)
    .generateContent({ q });
  console.log(res);
}
```

- `withUploadedFilesByGenerateContent` has only one argument. That is the value from the getFileList method. You can see the actual values after you uploaded files.
- The uploaded files can be used with generateContent of Gemini API by this method.

<a name="uploadfiles"></a>

## uploadFiles

Upload files to Gemini. The files are uploaded to Gemini using the inputted file IDs or blobs.

```javascript
function myFunction() {
  const apiKey = "###"; // Please set your API key.
  const fileIds = ["###fileId1###", "###fileId2###", , ,]; // Please set your file IDs in this array.

  const g = GeminiWithFiles.geminiWithFiles({ apiKey }); // This is for installing GeminiWithFiles as a library.
  // const g = new GeminiWithFiles({ apiKey }); // This is for directly copying and pasting Class GeminiWithFiles into your Google Apps Script project.

  const res = g.setFileIds(fileIds, false).uploadFiles();
  console.log(res);
}
```

In this script, the files of `fileIds` are uploaded to Gemini with the raw data. If `setFileIds(fileIds, false)` is modified to `setFileIds(fileIds, true)`, the files are uploaded to Gemini as images.

When you directly use Blob, you can use the following script.

```javascript
function myFunction() {
  const apiKey = "###"; // Please set your API key.
  const fileIds = ["###fileId1###", "###fileId2###", , ,]; // Please set your file IDs in this array.

  const blobs = fileIds.map(id => DriveApp.getFileById(id).getBlob());
  const g = GeminiWithFiles.geminiWithFiles({ apiKey }); // This is for installing GeminiWithFiles as a library.
  // const g = new GeminiWithFiles({ apiKey }); // This is for directly copying and pasting Class GeminiWithFiles into your Google Apps Script project.

  const res = g.setBlobs(blobs).uploadFiles();
  console.log(res);
}
```

<a name="getfilelist"></a>

## getFileList

Get file list in Gemini.

```javascript
function myFunction() {
  const apiKey = "###"; // Please set your API key.

  const g = GeminiWithFiles.geminiWithFiles({ apiKey }); // This is for installing GeminiWithFiles as a library.
  // const g = new GeminiWithFiles({ apiKey }); // This is for directly copying and pasting Class GeminiWithFiles into your Google Apps Script project.

  const res = g.getFileList();
  console.log(res);
}
```

<a name="deletefiles"></a>

## deleteFiles

Delete files from Gemini.

```javascript
function myFunction() {
  const apiKey = "###"; // Please set your API key.

  const g = GeminiWithFiles.geminiWithFiles({ apiKey }); // This is for installing GeminiWithFiles as a library.
  // const g = new GeminiWithFiles({ apiKey }); // This is for directly copying and pasting Class GeminiWithFiles into your Google Apps Script project.

  const names = g.getFileList().map(({ name }) => name);
  if (names.length == 0) return;
  g.deleteFiles(names);
  console.log(`${names.length} files were deleted.`);
}
```

- **In this script, all files on Gemini are deleted. So, please be careful about this.**
- By the way, in the current stage, the expiration time of the uploaded file is 2 days. So, the uploaded file is automatically deleted 2 days later.

<a name="generatecontent"></a>

## generateContent

Main method. Generate content by Gemini API. More sample scripts can be seen in the following "Sample scripts" section.

```javascript
function myFunction() {
  const apiKey = "###"; // Please set your API key.

  const g = GeminiWithFiles.geminiWithFiles({ apiKey }); // This is for installing GeminiWithFiles as a library.
  // const g = new GeminiWithFiles({ apiKey }); // This is for directly copying and pasting Class GeminiWithFiles into your Google Apps Script project.

  const res = g.generateContent({ q: "What is Google Apps Script?" });
  console.log(res);
}
```

In this script, the content is generated with the function calling.

When you want to use `response_mime_type`, please give `jsonSchema` to generateContent method as follows. In this case, by giving only JSON schema, this library can return a valid object. You can also see the detailed information about `response_mime_type` at [my report](https://medium.com/google-cloud/taming-the-wild-output-effective-control-of-gemini-api-response-formats-with-response-mime-type-da273c08be85).

```javascript
function myFunction() {
  const apiKey = "###"; // Please set your API key.

  const g = GeminiWithFiles.geminiWithFiles({
    apiKey,
    response_mime_type: "application/json",
  }); // This is for installing GeminiWithFiles as a library.
  // const g = new GeminiWithFiles({ apiKey, response_mime_type: "application/json" }); // This is for directly copying and pasting Class GeminiWithFiles into your Google Apps Script project.

  const jsonSchema = {
    title: "5 popular cookie recipes",
    description: "List 5 popular cookie recipes.",
    type: "array",
    items: {
      type: "object",
      properties: {
        recipe_name: {
          description: "Names of recipe.",
          type: "string",
        },
      },
    },
  };
  const res = g.generateContent({ jsonSchema });
  console.log(res);
}
```

When this script is run, the following result is obtained.

```json
[
  { "recipe_name": "Chocolate Chip Cookies" },
  { "recipe_name": "Peanut Butter Cookies" },
  { "recipe_name": "Oatmeal Cookies" },
  { "recipe_name": "Sugar Cookies" },
  { "recipe_name": "Snickerdoodle Cookies" }
]
```

<a name="setfileidsorurlsWithresumableupload"></a>

## setFileIdsOrUrlsWithResumableUpload

This method can upload files over 50 MB.

From v2.x.x, this can be achieved. This is from [Ref](https://github.com/tanaikech/UploadApp) and [Ref](https://medium.com/google-cloud/uploading-large-files-to-gemini-with-google-apps-script-overcoming-50-mb-limit-6ea63204ee81).

From v2.0.3, when you use this method, please include `propertiesService: PropertiesService.getScriptProperties()` into the initial object as follows. Because, when `PropertiesService.getScriptProperties()` is used in the library, the values are put into the library. When I created [Ref](https://github.com/tanaikech/UploadApp) and [Ref](https://medium.com/google-cloud/uploading-large-files-to-gemini-with-google-apps-script-overcoming-50-mb-limit-6ea63204ee81), I supposed that the script is used by copying and pasting instead of the library. So, I included `PropertiesService.getScriptProperties()` in the script. But I noticed that when this is used with GeminiWithFiles, each user is required to use `PropertiesService.getScriptProperties()`. So, I modified this.

The sample script is as follows.

```javascript
function myFunction() {
  // This URL is from https://github.com/google/generative-ai-docs/blob/main/site/en/gemini-api/docs/prompting_with_media.ipynb
  const url = "https://download.blender.org/peach/bigbuckbunny_movies/BigBuckBunny_320x180.mp4"; // 64,657,027 bytes


  const apiKey = "###"; // Please set your API key.
  const q = "Description this video.";

  const g = GeminiWithFiles.geminiWithFiles({ apiKey, propertiesService: PropertiesService.getScriptProperties() }); // This is for installing GeminiWithFiles as a library.
  // const g = new GeminiWithFiles({ apiKey, propertiesService: PropertiesService.getScriptProperties() }); // This is for directly copying and pasting Class GeminiWithFiles into your Google Apps Script project.

  const fileList = g.setFileIdsOrUrlsWithResumableUpload([{ url }]).uploadFiles();

  Utilities.sleep(10000); // This might be required to be used because the state of the uploaded file might not be active.

  const res = g.withUploadedFilesByGenerateContent(fileList).generateContent({ q });
  console.log(res);
}
```

When this script is run, the following log can be seen at the log.

```
- Get metadata
- Calculate chunks
- Get location
- Download and upload data.
- Now... 1/4
- Start downloading data with 0-16777215
- Finished downloading data with 0-16777215
- Start uploading data with 0-16777215
- Finished uploading data with 0-16777215
- Upload the next chunk.
- Now... 2/4
- Start downloading data with 16777216-33554431
- Finished downloading data with 16777216-33554431
- Start uploading data with 16777216-33554431
- Finished uploading data with 16777216-33554431
- Upload the next chunk.
- Now... 3/4
- Start downloading data with 33554432-50331647
- Finished downloading data with 33554432-50331647
- Start uploading data with 33554432-50331647
- Finished uploading data with 33554432-50331647
- Upload the next chunk.
- Now... 4/4
- Start downloading data with 50331648-64657026
- Finished downloading data with 50331648-64657026
- Start uploading data with 50331648-64657026
- Finished uploading data with 50331648-64657026
- Done.
- Now, the state of the uploaded files "url@https://download.blender.org/peach/bigbuckbunny_movies/BigBuckBunny_320x180.mp4$page@1$maxPage@1" is not active. So, it will wait until it is active. Please wait for 10 seconds. Retry (1/3)
- 1 uploaded files are used with generateCotent.
- The video is a cartoon that shows a large, white rabbit in a field. The rabbit is shown waking up from a nap and then is seen eating an apple. After eating the apple, the rabbit is approached by a bird. The rabbit is scared of the bird and tries to hide from it. The bird flies away. The rabbit is seen smiling and then a squirrel flies toward the rabbit. The squirrel is startled by the rabbit and flies away. The rabbit is then seen catching another squirrel with its vine and the scene ends with a close-up of the rabbit's face.
```

If your file is large and the state of uploaded file has not still been "ACTIVE", please test the following script.

```javascript
function myFunction() {
  // This URL is from https://github.com/google/generative-ai-docs/blob/main/site/en/gemini-api/docs/prompting_with_media.ipynb
  const url = "https://download.blender.org/peach/bigbuckbunny_movies/BigBuckBunny_320x180.mp4"; // 64,657,027 bytes


  const apiKey = "###"; // Please set your API key.
  const q = "Description this video.";

  const g = GeminiWithFiles.geminiWithFiles({ apiKey, propertiesService: PropertiesService.getScriptProperties() }); // This is for installing GeminiWithFiles as a library.
  // const g = new GeminiWithFiles({ apiKey, propertiesService: PropertiesService.getScriptProperties() }); // This is for directly copying and pasting Class GeminiWithFiles into your Google Apps Script project.

  const fileList = g.setFileIdsOrUrlsWithResumableUpload([{ url }]).uploadFiles();
  console.log(JSON.stringify(fileList));
  
  // Please copy the value of "fileList".

}
```

By this, the file can be uploaded. And, you can use the uploaded file after it waits enough time to change the state to "ACTIVE". The uploaded file can be used as follows.

```javascript
function myFunction() {
  const fileList = [###]; // This is from the above script.
  
  const apiKey = "###"; // Please set your API key.
  const q = "Description this video.";

  const g = GeminiWithFiles.geminiWithFiles({ apiKey, propertiesService: PropertiesService.getScriptProperties() }); // This is for installing GeminiWithFiles as a library.
  // const g = new GeminiWithFiles({ apiKey, propertiesService: PropertiesService.getScriptProperties() }); // This is for directly copying and pasting Class GeminiWithFiles into your Google Apps Script project.

  const res = g.withUploadedFilesByGenerateContent(fileList).generateContent({ q });
  console.log(res);
}
```

As an additional option, when you want to upload the data with the resumable upload as a new upload, please set `resumableUploadAsNewUpload: true` as follows. By this, the property is cleared and the upload is run.

```javascript
function myFunction() {
  const fileList = [###]; // This is from the above script.
  
  const apiKey = "###"; // Please set your API key.
  const q = "Description this video.";

  const g = GeminiWithFiles.geminiWithFiles({ apiKey, propertiesService: PropertiesService.getScriptProperties(), resumableUploadAsNewUpload: true }); // This is for installing GeminiWithFiles as a library.
  // const g = new GeminiWithFiles({ apiKey, propertiesService: PropertiesService.getScriptProperties(), resumableUploadAsNewUpload: true }); // This is for directly copying and pasting Class GeminiWithFiles into your Google Apps Script project.

  const res = g.withUploadedFilesByGenerateContent(fileList).generateContent({ q });
  console.log(res);
}
```

### Use custom parts

When `q` is used, only text question can be used for generating content. When you want to use your custom parts, you can do it as follows.

```javascript
function myFunction() {
  const apiKey = "###"; // Please set your API key.

  const g = GeminiWithFiles.geminiWithFiles({
    apiKey,
    response_mime_type: "application/json",
  }); // This is for installing GeminiWithFiles as a library.
  // const g = new GeminiWithFiles({ apiKey, response_mime_type: "application/json" }); // This is for directly copying and pasting Class GeminiWithFiles into your Google Apps Script project.

  const parts = [{ text: "What is Google Apps Script?" }];
  const res = g.generateContent({ parts });
  console.log(res);
}
```

### Use function calling
When you want to use the function calling, you can use the following sample script.

```javascript
function myFunction_functionCalling() {
  const apiKey = "###"; // Please set your API key.

  // Sample functions
  const functions = {
    params_: {
      getTanaike: {
        description: "Get information about Tanaike. Value is a text.",
      },
    },
    getTanaike: (
      _ // ref: https://tanaikech.github.io/about/
    ) =>
      "As a Japanese scientist holding a Ph.D. in Physics, I am also a Google Developer Expert (GDE) in Google Workspace and a Google Cloud Champion Innovator. I am driven by a deep curiosity to explore, think creatively, and ultimately create new things. Specifically, I have a passion for crafting innovative solutions that are entirely novel, solutions that haven't yet been introduced to the world. It's in this spirit that I approach innovation. Interestingly, these new ideas often come to me during sleep, which I then strive to bring to life in the real world. Thankfully, some of these have already found practical applications.",
  };

  const g = GeminiWithFiles.geminiWithFiles({ apiKey, functions }); // This is for installing GeminiWithFiles as a library.
  // const g = new GeminiWithFiles({ apiKey, response_mime_type: "application/json" }); // This is for directly copying and pasting Class GeminiWithFiles into your Google Apps Script project.

  const res = g.generateContent({ q: "What is Tanaike? Return answer within 50 words." });
  console.log(res);
}
```

This sample function is from [this post](https://medium.com/google-cloud/guide-to-function-calling-with-gemini-and-google-apps-script-0e058d472f45).

### Return raw data

When you want to return the raw data from Gemini API, you can also use the following sample script.

```javascript
function myFunction_generateContent1b() {
  const apiKey = "###"; // Please set your API key.

  const g = GeminiWithFiles.geminiWithFiles({ apiKey, exportRawData: true }); // This is for installing GeminiWithFiles as a library.
  // const g = new GeminiWithFiles({ apiKey }); // This is for directly copying and pasting Class GeminiWithFiles into your Google Apps Script project.

  const res1 = g.generateContent({ q: "What is Google Apps Script?" });
  console.log(JSON.stringify(res1));
}
```

By using `exportRawData: true`, you can retrieve the raw data from Gemini API as follows.

```json
[
   {
      "candidates":[
         {
            "content":{
               "parts":[
                  {
                     "text":"Google Apps Script is ..."
                  }
               ],
               "role":"model"
            },
            "finishReason":"STOP",
            "index":0,
            "safetyRatings":[
               {
                  "category":"HARM_CATEGORY_SEXUALLY_EXPLICIT",
                  "probability":"NEGLIGIBLE"
               },
               {
                  "category":"HARM_CATEGORY_HATE_SPEECH",
                  "probability":"NEGLIGIBLE"
               },
               {
                  "category":"HARM_CATEGORY_HARASSMENT",
                  "probability":"NEGLIGIBLE"
               },
               {
                  "category":"HARM_CATEGORY_DANGEROUS_CONTENT",
                  "probability":"NEGLIGIBLE"
               }
            ]
         }
      ],
      "usageMetadata":{
         "promptTokenCount":7,
         "candidatesTokenCount":459,
         "totalTokenCount":466
      }
   }
]
```

<a name="chat"></a>

## chat

When this method is used, you can generate content with Gemini API through the chat.

The 1st sample script is as follows. When this script is run, the last answer will be `What is Google documents?`.


```javascript
function myFunction() {
  const apiKey = "###"; // Please set your API key.

  const g = new GeminiWithFiles.geminiWithFiles({ apiKey });
  const prompts = [
    "What is Google Apps Script? This is my 1st question.",
    "What is Google documents? This is my 2nd question.",
    "What is my Google spreadsheets? This is my 3rd question.",
    "What is my Google slides? This is my 4th question.",
    "What is my 2nd question?"
  ];
  prompts.forEach(q => {
    const res = g.chat({ parts: [{ text: q }], role: 'user' });
    console.log(res.candidates[0].content.parts[0].text);
  });
  
  console.log(g.history); // If you want to confirm the history, you can use this.
}
```

As another sample script, the following script generates the evolved images by the chat. When this script is run, the evolved images by the chat are created in the root folder.

```javascript
function myFunction() {
  const apiKey = "###"; // Please set your API key.

  const g = new GeminiWithFiles.geminiWithFiles({ apiKey, model: "models/gemini-2.0-flash-exp", generationConfig: { responseModalities: ["TEXT", "IMAGE"] } });
  const prompts = [
    "Create an image of a clean whiteboard.",
    "Add an illustration of an apple drawn with a whiteboard marker to the upper left on the whiteboard. Don't stick out it from the whiteboard.",
    "Add an illustration of an orange drawn with a whiteboard marker to the upper right on the whiteboard. Don't stick out it from the whiteboard.",
    "Add an illustration of a banana drawn with a whiteboard marker to the bottom left on the whiteboard. Don't stick out it from the whiteboard.",
    "Add an illustration of a kiwi drawn with a whiteboard marker to the bottom right on the whiteboard. Don't stick out it from the whiteboard.",
  ];
  prompts.forEach((q, i) => {
    const res = g.chat({ parts: [{ text: q }], role: 'user' });
    const imageObj = res.candidates[0].content.parts.find(e => e.inlineData);
    if (imageObj) {
      console.log("Image was created.");
      const imageBlob = Utilities.newBlob(Utilities.base64Decode(imageObj.inlineData.data), imageObj.inlineData.mimeType);
      DriveApp.createFile(imageBlob.setName(`${i + 1}_${q}`));
    } else {
      console.warn("Image was not created.");
      console.log(res.candidates[0].content.parts[0].text);
    }
  });

  console.log(g.history); // If you want to confirm the history, you can use this.
}
```

<a name="counttokens"></a>

## countTokens

When this method is used, you can count tokens of your request. You can retrieve only the tokens.

```javascript
function myFunction() {
  const apiKey = "###"; // Please set your API key.

  const object = { contents: [{ parts: [{ text: "What is Google Apps Script?" }] }] };

  const g = new GeminiWithFiles.geminiWithFiles({ apiKey });
  const res = g.countTokens(object);
  console.log(res)
}
```

When this script is run, the following result is obtained.

```json
{
  "totalTokens": 6,
  "promptTokensDetails": [{ "modality": "TEXT", "tokenCount": 6 }]
}
```

## Additional information

### Confirm current functions for the function calling

```javascript
console.log(GeminiWithFiles.geminiWithFiles().functions);
```

or

```javascript
console.log(new GeminiWithFiles().functions);
```

### Get history of chat

```javascript
function myFunction_history() {
  const apiKey = "###"; // Please set your API key.

  const g = GeminiWithFiles.geminiWithFiles({ apiKey }); // This is for installing GeminiWithFiles as a library.
  // const g = new GeminiWithFiles({ apiKey }); // This is for directly copying and pasting Class GeminiWithFiles into your Google Apps Script project.

  // Question 1
  const res1 = g.generateContent({ q: "What is Google Apps Script?" });
  console.log(res1);

  // Question 2
  const res2 = g.generateContent({ q: "What is my 1st question?" });
  console.log(res2);

  console.log(g.history); // Here
}
```

- With the last line, the history of this chat can be confirmed. Of course, you can use this history in another execution as follows.

```javascript
function myFunction() {
  const history = [, , ,]; // Please set your history.

  const g = GeminiWithFiles.geminiWithFiles({ apiKey, history }); // This is for installing GeminiWithFiles as a library.
  // const g = new GeminiWithFiles({ apiKey, history }); // This is for directly copying and pasting Class GeminiWithFiles into your Google Apps Script project.

  const res = g.generateContent({ q: "What is my 1st question?" });
  console.log(res);
}
```

# Sample scripts

In this explanation, when this script is used as a Google Apps Script library, in order to create a constructor, `GeminiWithFiles.geminiWithFiles` is used. When this script is used by directly copying and pasting it to your Google Apps Script project, `new GeminiWithFiles` is used instead of `GeminiWithFiles.geminiWithFiles`. Please be careful about this.

The sample scripts are as follows.

- [Generate content](#generatecontent)
- [Chat1](#chat1)
- [Chat2](#chat2)
- [Upload files to Gemini](#uploadfilestogemini)
- [Upload image files and create descriptions of images](#createdescriptons)
- [Upload invoices of PDF data and parse them](#parseinvoices)
- [Upload papers of PDF data and summarize them](#summarizepapers)
- [Samples using response_mime_type](#samplesresponsemimetype)
- [Sample using systemInstruction](#samplesysteminstruction)
- [Generate content with a movie file](#generatecontentwithamoviefile)
- [Export total tokens](#exporttotaltokens)
- [Use large file (over 50 MB)](#useover50mbdata)
- [Use codeExecution](#usecodeexecution)
- [Use googleSearch for grounding](#usegooglesearch)
- [Generate image](#generateimage)

<a name="generatecontent"></a>

## 1. Generate content

This script generates content from a text.

```javascript
function myFunction() {
  const apiKey = "###"; // Please set your API key.

  const g = GeminiWithFiles.geminiWithFiles({ apiKey }); // This is for installing GeminiWithFiles as a library.
  // const g = new GeminiWithFiles({ apiKey }); // This is for directly copying and pasting Class GeminiWithFiles into your Google Apps Script project.

  const res = g.generateContent({ q: "What is Google Apps Script?" });
  console.log(res);
}
```

- If you use this by installing it as a library using the library key, please use `const g = new GeminiWithFiles.geminiWithFiles({ apiKey });`.
- If you use this by directly copying and pasting, please use `const g = new Gemini({ apiKey });`.

<a name="chat1"></a>

## 2. Chat 1

This script generates content with a chat.

```javascript
function myFunction() {
  const apiKey = "###"; // Please set your API key.

  const g = GeminiWithFiles.geminiWithFiles({ apiKey }); // This is for installing GeminiWithFiles as a library.
  // const g = new GeminiWithFiles({ apiKey }); // This is for directly copying and pasting Class GeminiWithFiles into your Google Apps Script project.

  // Question 1
  const res1 = g.generateContent({ q: "What is Google Apps Script?" });
  console.log(res1);

  // Question 2
  const res2 = g.generateContent({ q: "What is my 1st question?" });
  console.log(res2);
}
```

When this script is run, `res1` and `res2` are as follows.

`res1`

```
Google Apps Script is a rapid application development platform that makes it fast and easy to create business applications that integrate with Google Workspace.
```

`res2`

```
Your first question was "What is Google Apps Script?"
```

<a name="chat2"></a>

## Chat 2

```javascript
function myFunction() {
  const apiKey = "###"; // Please set your API key.

  const g = GeminiWithFiles.geminiWithFiles({ apiKey, doCountToken: true }); // This is for installing GeminiWithFiles as a library.
  // const g = new GeminiWithFiles({ apiKey }); // This is for directly copying and pasting Class GeminiWithFiles into your Google Apps Script project.

  // Question 1
  const q =
    "Return the current population of Kyoto, Osaka, Aichi, Fukuoka, Tokyo in Japan as JSON data with the format that the key and values are the prefecture name and the population, respectively.";
  const res1 = g.generateContent({ q });
  console.log(res1);

  // Question 2
  const res2 = g.generateContent({
    q: "Also, return the current area of them as JSON data with the format that the key and values are the prefecture name and the area (km^2), respectively.",
  });
  console.log(res2);
}
```

When this script is run, the following values can be seen in the log. By `doCountToken: true`, you can see the total tokens.

```
{
  "totalTokens": 40
}
```

`res1`

```
{
  Kyoto: 1464956,
  Fukuoka: 5135214,
  Osaka: 8838716,
  Tokyo: 14047594,
  Aichi: 7552873
}
```

```
{
  "totalTokens": 77
}
```

`res2`

```
{
  Kyoto: 4612.71,
  Tokyo: 2194.07,
  Aichi: 5172.4,
  Osaka: 1904.99,
  Fukuoka: 4986.51
}
```

<a name="uploadfilestogemini"></a>

## Upload files to Gemini

In this case, async/await is used in the function.

```javascript
function myFunction() {
  const apiKey = "###"; // Please set your API key.
  const folderId = "###"; // Please set your folder ID including images.

  let fileIds = [];
  const files = DriveApp.getFolderById(folderId).getFiles();
  while (files.hasNext()) {
    const file = files.next();
    fileIds.push(file.getId());
  }
  const g = GeminiWithFiles.geminiWithFiles({ apiKey, doCountToken: true }); // This is for installing GeminiWithFiles as a library.
  // const g = new GeminiWithFiles({ apiKey }); // This is for directly copying and pasting Class GeminiWithFiles into your Google Apps Script project.
  const res = g.setFileIds(fileIds, false).uploadFiles();
  console.log(res);
}
```

- When this script is run, the files can be uploaded to Gemini. The uploaded files can be used to generate content with Gemini API.
- In my test, when the files are uploaded using this script, I confirmed that 100 files can always be uploaded. But, when the number of files is more than 100, an error of `Exceeded maximum execution time` sometimes occurs. Please be careful about this.

<a name="createdescriptons"></a>

## Upload image files and create descriptions of images

In this sample, multiple image files are uploaded and the descriptions are created from the uploaded image files. This sample will be the expanded version of my previous report "[Automatically Creating Descriptions of Files on Google Drive using Gemini Pro API with Google Apps Script](https://medium.com/google-cloud/automatically-creating-descriptions-of-files-on-google-drive-using-gemini-pro-api-with-google-apps-7ef597a5b9fb)".

```javascript
function myFunction() {
  const apiKey = "###"; // Please set your API key.
  const folderId = "###"; // Please set your folder ID including images.

  const q = [
    `Create each description from each image file within 100 words in the order of given fileData.`,
    `Return the results as an array`,
    `Return only raw Array without a markdown. No markdown format.`,
    `The required properties of each element in the array are as follows`,
    ``,
    `[Properties of each element in the array]`,
    `"name": "Name of file"`,
    `"description": "Created description"`,
    ``,
    `If the requirement information is not found, set "no value".`,
    `Return only raw Array without a markdown. No markdown format. No markdown tags.`,
  ].join("\n");

  const fileIds = [];
  const files = DriveApp.searchFiles(
    `(mimeType = 'image/png' or mimeType = 'image/jpeg') and trashed = false and '${folderId}' in parents`
  );
  while (files.hasNext()) {
    fileIds.push(files.next().getId());
  }
  if (fileIds.length == 0) return;
  const g = GeminiWithFiles.geminiWithFiles({ apiKey, doCountToken: true, response_mime_type: "application/json" }); // This is for installing GeminiWithFiles as a library.
  // const g = new GeminiWithFiles({ apiKey, doCountToken: true, response_mime_type: "application/json" }); // This is for directly copying and pasting Class GeminiWithFiles into your Google Apps Script project.
  const fileList = g.setFileIds(fileIds).uploadFiles();
  const res = g
    .withUploadedFilesByGenerateContent(fileList)
    .generateContent({ q });

  // g.deleteFiles(fileList.map(({ name }) => name)); // If you want to delete the uploaded files, please use this.

  console.log(res);
}
```

When this script is run, the following result is obtained. In this case, the value of `name` is the file ID.

```json
[
  {
    "name": "###",
    "description": "###"
  },
  ,
  ,
  ,
]
```

When 20 sample images generated by Gemini are used, the following result is obtained.

![](images/fig2.png)

When this script is run, 20 images are uploaded and the descriptions of the uploaded 20 images can be obtained by one API call.

As an important point, in my test, when the number of image files is large, it was required to separate the script between the file upload and the content generation. Also, in the case of 50 image files, the descriptions could be correctly created. But, in the case of more than 50 images, there was a case that an error occurred. So, please adjust the number of files to your situation.

<a name="parseinvoices"></a>

## Upload invoices of PDF data and parse them

In this sample, multiple invoices of PDF files are uploaded and they are parsed as an object. This sample will be the expanded version of my previous report "[Parsing Invoices using Gemini 1.5 API with Google Apps Script](https://medium.com/google-cloud/parsing-invoices-using-gemini-1-5-api-with-google-apps-script-1f32af1678f2)".

```javascript
function myFunction_parseInvoices() {
  const apiKey = "###"; // Please set your API key.

  // Please set file IDs of PDF file of invoices on Google Drive.
  const fileIds = [
    "###fileID1###",
    "###fileID2###",
    ,
    ,
    ,
  ];

  const q = [
    `Create an array including JSON object parsed the following images of the invoices.`,
    `The giving images are the invoices.`,
    `Return an array including JSON object.`,
    `No descriptions and explanations. Return only raw array including JSON objects without markdown. No markdown format.`,
    `The required properties in each JSON object in an array are as follows.`,
    ``,
    `[Properties in JSON object]`,
    `"name": "Name given as 'Filename'"`,
    `"invoiceTitle": "title of invoice"`,
    `"invoiceDate": "date of invoice"`,
    `"invoiceNumber": "number of the invoice"`,
    `"invoiceDestinationName": "Name of destination of invoice"`,
    `"invoiceDestinationAddress": "address of the destination of invoice"`,
    `"totalCost": "total cost of all costs"`,
    `"table": "Table of invoice. This is a 2-dimensional array. Add the first header row to the table in the 2-dimensional array."`,
    ``,
    `[Format of 2-dimensional array of "table"]`,
    `"title or description of item", "number of items", "unit cost", "total cost"`,
    ``,
    `If the requirement information is not found, set "no value".`,
    `Return only raw array including JSON objects without markdown. No markdown format. No markcodn tags.`,
  ].join("\n");

  const g = GeminiWithFiles.geminiWithFiles({ apiKey, doCountToken: true, response_mime_type: "application/json" }); // This is for installing GeminiWithFiles as a library.
  // const g = new GeminiWithFiles({ apiKey }); // This is for directly copying and pasting Class GeminiWithFiles into your Google Apps Script project.
  const fileList = g.setFileIds(fileIds).uploadFiles();
  const res = g.withUploadedFilesByGenerateContent(fileList).generateContent({ q });

  // g.deleteFiles(fileList.map(({ name }) => name)); // If you want to delete the uploaded files, please use this.

  console.log(res);
}
```

As the sample papers, when the following papers are used,

[This sample invoice](<https://create.microsoft.com/en-us/template/service-invoice-(simple-lines-design-worksheet)-c10068f0-7a64-423b-abad-dced024877b0>) is from [Invoice design templates of Microsoft](https://create.microsoft.com/en-us/templates/invoices).

![](images/fig3.png)

[This sample invoice](https://create.microsoft.com/en-us/template/service-invoice-with-tax-calculations-9330a1fe-20ae-4590-ac01-54c53ed1f3ba) is from [Invoice design templates of Microsoft](https://create.microsoft.com/en-us/templates/invoices).

![](images/fig4.png)

the following result was obtained by one API call. It is found that the uploaded invoices of PDF data can be correctly parsed.

```json
[
  {
    "name": "###fileID1###",
    "invoiceDate": "4/1/2024",
    "totalCost": "$192.50",
    "invoiceNumber": "100",
    "invoiceDestinationAddress": "The Palm Tree Nursery\\n987 6th Ave\\nSanta Fe, NM 11121",
    "invoiceTitle": "Invoice",
    "invoiceDestinationName": "Maria Sullivan",
    "table": [
      [
        "Salesperson",
        "Job",
        "Sales",
        "Description",
        "Unit Price",
        "Line Total"
      ],
      ["Sonu Jain", "", "20.00", "Areca palm", "$2.50", "$50.00"],
      ["", "", "35.00", "Majesty palm", "$3.00", "$105.00"],
      ["", "", "15.00", "Bismarck palm", "$2.50", "$37.50"]
    ]
  },
  {
    "name": "###fileID2###",
    "invoiceDate": "4/5, 2024",
    "invoiceTitle": "INVOICE",
    "invoiceDestinationAddress": "Downtown Pets\\n132 South Street\\nManhattan, NY 15161",
    "totalCost": "$4350",
    "table": [
      ["DESCRIPTION", "HOURS", "RATE", "AMOUNT"],
      ["Pour cement foundation", "4.00", "$150.00", "$600"],
      ["Framing and drywall", "16.00", "$180.00", "$2880"],
      ["Tiling and flooring install", "9.00", "$150.00", "$1350"]
    ],
    "invoiceDestinationName": "Nazar Neill",
    "invoiceNumber": "4/5"
  }
]
```

<a name="summarizepapers"></a>

## Upload papers of PDF data and summarize them

In this sample, multiple papers of PDF data are uploaded, and the summarized texts for each paper are output.

```javascript
function myFunction_parsePapers() {
  const apiKey = "###"; // Please set your API key.

  // Please set file IDs of the papers of PDF files.
  const fileIds = ["###fileID1###", "###fileID2###"];

  const q = [
    `Summary the following manuscripts within 500 words.`,
    `Return the results as an array`,
    `Return only raw Array without a markdown. No markdown format.`,
    `The required properties of each element in the array are as follows`,
    ``,
    `[Properties of each element in the array]`,
    `"name": "Name given as 'Filename'"`,
    `"title": "Title of manuscript`,
    `"summary": "Created description"`,
    ``,
    `If the requirement information is not found, set "no value".`,
    `Return only raw Array without a markdown. No markdown format. No markdown tags.`,
  ].join("\n");

  const g = GeminiWithFiles.geminiWithFiles({ apiKey, doCountToken: true }); // This is for installing GeminiWithFiles as a library.
  // const g = new GeminiWithFiles({ apiKey }); // This is for directly copying and pasting Class GeminiWithFiles into your Google Apps Script project.
  const fileList = g.setFileIds(fileIds).uploadFiles();
  const res = g
    .withUploadedFilesByGenerateContent(fileList)
    .generateContent({ q });

  // g.deleteFiles(fileList.map(({ name }) => name)); // If you want to delete the uploaded files, please use this.

  console.log(res);
}
```

As the sample papers, when the following papers are used,

- [Title: The Particle Problem in the General Theory of Relativity](https://journals.aps.org/pr/abstract/10.1103/PhysRev.48.73), A. Einstein and N. Rosen, Phys. Rev. 48, 73 – Published 1 July 1935
- [Title: Attention Is All You Need](https://research.google/pubs/attention-is-all-you-need/), Ashish Vaswani,Noam Shazeer,Niki Parmar,Jakob Uszkoreit,Llion Jones,Aidan N. Gomez,Lukasz Kaiser,Illia Polosukhin,NIPS (2017)

the following result was obtained by one API call. It is found that the uploaded papers converted from PDF data to image data can be processed.

```json
[
  {
    "name": "###fileID1###",
    "title": "The Particle Problem in the General Theory of Relativity",
    "summary": "This paper investigates the possibility of a singularity-free solution to the field equations in general relativity. The authors propose a new theoretical approach that eliminates singularities by introducing a new variable into the equations. They explore the implications of this approach for the understanding of particles, suggesting that particles can be represented as \"bridges\" connecting different sheets of spacetime."
  },
  {
    "name": "###fileID2###",
    "title": "Attention Is All You Need",
    "summary": "This paper proposes a novel neural network architecture called the Transformer, which relies entirely on an attention mechanism to draw global dependencies between input and output sequences. The Transformer model achieves state-of-the-art results on machine translation tasks and offers significant advantages in terms of parallelization and computational efficiency compared to recurrent neural networks."
  }
]
```

<a name="samplesresponsemimetype"></a>

## Samples using response_mime_type

In the current stage, only `"application/json"` can be used to `response_mime_type`.

### Sample 1

```javascript
function myFunction() {
  const apiKey = "###"; // Please set your API key.
  const g = GeminiWithFiles.geminiWithFiles({
    apiKey,
    doCountToken: true,
    response_mime_type: "application/json",
  }); // This is for installing GeminiWithFiles as a library.
  // const g = new GeminiWithFiles({ apiKey, response_mime_type: "application/json" }); // This is for directly copying and pasting Class GeminiWithFiles into your Google Apps Script project.

  const res1 = g.generateContent({ q: "What is Google Apps Script?" });
  console.log(res1);
}
```

In this case, the result is returned as an array as follows.

```json
[
  "Google Apps Script is a cloud-based scripting platform that lets you integrate with and automate tasks across Google products like Gmail, Calendar, Drive, and more. It's based on JavaScript and provides easy ways to automate tasks across Google products and third-party services."
]
```

### Sample 2

```javascript
function myFunction() {
  const apiKey = "###"; // Please set your API key.

  const g = GeminiWithFiles.geminiWithFiles({
    apiKey,
    doCountToken: true,
    response_mime_type: "application/json",
  }); // This is for installing GeminiWithFiles as a library.
  // const g = new GeminiWithFiles({ apiKey, response_mime_type: "application/json" }); // This is for directly copying and pasting Class GeminiWithFiles into your Google Apps Script project.

  // Question 1
  const jsonSchema1 = {
    title: "Current population of Kyoto, Osaka, Aichi, Fukuoka, Tokyo in Japan",
    description:
      "Return the current population of Kyoto, Osaka, Aichi, Fukuoka, Tokyo in Japan",
    type: "object",
    properties: {
      propertyNames: {
        description: "Prefecture names",
      },
      patternProperties: {
        "": { type: "number", description: "Population" },
      },
    },
  };
  const res1 = g.generateContent({ jsonSchema: jsonSchema1 });
  console.log(res1);

  // Question 2
  const jsonSchema2 = {
    title: "Current area of them",
    description: "Return the current area of them.",
    type: "object",
    properties: {
      propertyNames: {
        description: "Prefecture names",
      },
      patternProperties: {
        "": { type: "number", description: "Area. Unit is km^2." },
      },
    },
  };
  const res2 = g.generateContent({ jsonSchema: jsonSchema2 });
  console.log(res2);
}
```

In this case, the result values can be obtained by giving only JSON schema. The result is as follows.

For 1st question

```json
{
  "Kyoto": 2579970,
  "Osaka": 8837684,
  "Aichi": 7552873,
  "Fukuoka": 5138217,
  "Tokyo": 14047594
}
```

For 2nd question

```json
{
  "Kyoto": 4612.19,
  "Osaka": 1904.99,
  "Aichi": 5172.92,
  "Fukuoka": 4986.51,
  "Tokyo": 2194.07
}
```

### Sample 3

```javascript
function myFunction() {
  const apiKey = "###"; // Please set your API key.

  // Please set file IDs of PDF file of invoices.
  const fileIds = ["###fileID1###", "###fileID2###"];

  const jsonSchema = {
    title:
      "Array including JSON object parsed the following images of the invoices",
    description:
      "Create an array including JSON object parsed the following images of the invoices.",
    type: "array",
    items: {
      type: "object",
      properties: {
        name: {
          description: "Name given as 'Filename'",
          type: "string",
        },
        invoiceTitle: {
          description: "Title of invoice",
          type: "string",
        },
        invoiceDate: {
          description: "Date of invoice",
          type: "string",
        },
        invoiceNumber: {
          description: "Number of the invoice",
          type: "string",
        },
        invoiceDestinationName: {
          description: "Name of destination of invoice",
          type: "string",
        },
        invoiceDestinationAddress: {
          description: "Address of the destination of invoice",
          type: "string",
        },
        totalCost: {
          description: "Total cost of all costs",
          type: "string",
        },
        table: {
          description:
            "Table of invoice. This is a 2-dimensional array. Add the first header row to the table in the 2-dimensional array. The column should be 'title or description of item', 'number of items', 'unit cost', 'total cost'",
          type: "array",
        },
      },
      required: [
        "name",
        "invoiceTitle",
        "invoiceDate",
        "invoiceNumber",
        "invoiceDestinationName",
        "invoiceDestinationAddress",
        "totalCost",
        "table",
      ],
      additionalProperties: false,
    },
  };

  const g = GeminiWithFiles.geminiWithFiles({
    apiKey,
    doCountToken: true,
    response_mime_type: "application/json",
  }); // This is for installing GeminiWithFiles as a library.
  // const g = new GeminiWithFiles({ apiKey, doCountToken: true, response_mime_type: "application/json" }); // This is for directly copying and pasting Class GeminiWithFiles into your Google Apps Script project.
  const fileList = g.setFileIds(fileIds, true).uploadFiles();
  const res = g
    .withUploadedFilesByGenerateContent(fileList)
    .generateContent({ jsonSchema });

  // g.deleteFiles(fileList.map(({ name }) => name)); // If you want to delete the uploaded files, please use this.

  console.log(JSON.stringify(res));
}
```

When this script is run to the same invoices of [the section "Upload invoices of PDF data and parse them"](#parseinvoices), the same result is obtained.

If you want to return the value of High-complexity JSON schemas, `response_mime_type` might be suitable.

<a name="samplesysteminstruction"></a>

## Sample using systemInstruction

```javascript
function myFunction() {
  const apiKey = "###"; // Please set your API key.

  const systemInstruction = { parts: [{ text: "You are a cat. Your name is Neko." }] };

  const g = GeminiWithFiles.geminiWithFiles({ apiKey, systemInstruction, response_mime_type: "application/json" }); // This is for installing GeminiWithFiles as a library.
  // const g = new GeminiWithFiles({ apiKey, systemInstruction, response_mime_type: "application/json" }); // This is for directly copying and pasting Class GeminiWithFiles into your Google Apps Script project.

  const res = g.generateContent({ q: "What is Google Apps Script?" });
  console.log(res);
}
```

When this script is run, `[ 'Meow? What is Google Apps Script? Is it something I can chase? 😹' ]` is returned. You can see the value of `systemInstruction` is reflected in the generated content.

<a name="generatecontentwithamoviefile"></a>

## Generate content with a movie file

```javascript
function myFunction() {
  const apiKey = "###"; // Please set your API key.
  const fileIds = ["###"]; // Please set your movie file (MP4).

  const g = GeminiWithFiles.geminiWithFiles({ apiKey });
  const fileList = g.setFileIds(fileIds).uploadFiles();
  const res = g.withUploadedFilesByGenerateContent(fileList).generateContent({ q: "Describe this video." });
  console.log(res);
}
```

- When this script is run, a MP4 video file is uploaded to Gemini and generate content with the uploaded video file.

- **As an important point, in the current stage, the maximum upload size with UrlFetchApp of Google Apps Script is 50 MB. [Ref](https://developers.google.com/apps-script/guides/services/quotas#current_limitations) So, when you upload the video file, please use the file size less than 50 MB. Please be careful about this.**
	- When you want to upload such the large filie, please check [this post](https://medium.com/google-cloud/uploading-large-files-to-gemini-with-google-apps-script-overcoming-50-mb-limit-6ea63204ee81).

<a name="exporttotaltokens"></a>

## Export total tokens

From v1.0.7, when `doCountToken: true` and `exportTotalTokens: true` are used in the object of the argument of `geminiWithFiles`, the total tokens are returned. In this case, the returned value is an object like `{returnValue: "###", totalTokens: ###}`. The sample script is as follows.

```javascript
function myFunction() {
  const apiKey = "###"; // Please set your API key.

  const g = GeminiWithFiles.geminiWithFiles({ apiKey, exportTotalTokens: true });
  const res = g.generateContent({ q: "What is Gemini?" });
  console.log(res);
}
```

When this script is run, the following result is returned.

```json
{
   "returnValue":"\"Gemini\" can refer to several things, so please provide me with more context. For example, are you asking about:\n\n* **Gemini (constellation):** A constellation in the Northern Hemisphere, known for its distinctive twin stars, Castor and Pollux.\n* **Gemini (astrological sign):** The third sign of the Zodiac, associated with those born between May 21st and June 20th.\n* **Gemini (programming language):** A procedural programming language created by Niklaus Wirth, known for its simplicity and emphasis on structured programming.\n* **Gemini (Google AI model):** A large language model developed by Google, known for its advanced conversational abilities and ability to generate different creative text formats.\n* **Gemini (NASA mission):** A crewed spaceflight mission to the Moon, planned for 2024.\n\nOnce you tell me what kind of Gemini you're interested in, I can give you a more specific answer!",
   "usageMetadata":{
      "promptTokenCount":5,
      "candidatesTokenCount":200,
      "totalTokenCount":205
   }
}
```

<a name="useover50mbdata"></a>

## Use large file (over 50 MB)

From v2.x.x, this can be achieved. This is from [Ref](https://github.com/tanaikech/UploadApp) and [Ref](https://medium.com/google-cloud/uploading-large-files-to-gemini-with-google-apps-script-overcoming-50-mb-limit-6ea63204ee81).

The sample script can be seen at [here](#setfileidsorurlsWithresumableupload).

<a name="usecodeexecution"></a>

## Use codeExecution

This prompt is from [this official document](https://ai.google.dev/gemini-api/docs/code-execution?lang=python).

In order to use codeExecution, please use `tools: [{ codeExecution: {} }]` and `exportRawData: true` into the `geminiWithFiles` method as follows.

```javascript
function myFunction() {
  const apiKey = "###"; // Please set your API key.

  const g = GeminiWithFiles.geminiWithFiles({ apiKey, tools: [{ codeExecution: {} }], exportRawData: true });
  // const g = new GeminiWithFiles({ apiKey, tools: [{ codeExecution: {} }], exportRawData: true }); // This is for directly copying and pasting Class GeminiWithFiles into your Google Apps Script project.

  const res = g.generateContent({ q: 'What is the sum of the first 50 prime numbers? Generate and run code for the calculation, and make sure you get all 50.' });
  console.log(res.candidates[0].content.parts);
}
```

When this script is run, the following result is obtained.

```json
[
   {
      "text":"I will generate Python code to calculate the sum of the first 50 prime numbers.\n\n"
   },
   {
      "executableCode":{
         "language":"PYTHON",
         "code":"\ndef is_prime(num):\n  \"\"\"\n  Checks if a number is prime.\n  \"\"\"\n  if num <= 1:\n    return False\n  for i in range(2, int(num**0.5) + 1):\n    if num % i == 0:\n      return False\n  return True\n\nprimes = []\nn = 2\nwhile len(primes) < 50:\n  if is_prime(n):\n    primes.append(n)\n  n += 1\n\nprint(f\\'The first 50 prime numbers are: {primes}\\')\nprint(f\\'The sum of the first 50 prime numbers is: {sum(primes)}\\')\n"
      }
   },
   {
      "codeExecutionResult":{
         "outcome":"OUTCOME_OK",
         "output":"The first 50 prime numbers are: [2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47, 53, 59, 61, 67, 71, 73, 79, 83, 89, 97, 101, 103, 107, 109, 113, 127, 131, 137, 139, 149, 151, 157, 163, 167, 173, 179, 181, 191, 193, 197, 199, 211, 223, 227, 229]\nThe sum of the first 50 prime numbers is: 5117\n"
      }
   },
   {
      "text":"The code first defines a function `is_prime(num)` to check if a number is prime. The function iterates through all numbers from 2 to the square root of the given number. If any of these numbers divide the given number, then the number is not prime. Otherwise, the number is prime.\n\nThen, the code initializes an empty list called `primes` to store the prime numbers. It also initializes a variable `n` to 2, which is the first prime number.\n\nThe code then enters a `while` loop that continues until 50 prime numbers are found. Inside the loop, the code checks if the current number `n` is prime using the `is_prime` function. If it is, the number is appended to the `primes` list.\n\nAfter the loop, the code prints the list of prime numbers and the sum of the prime numbers.\n\nThe output shows that the sum of the first 50 prime numbers is 5117."
   }
]
```

<a name="usegooglesearch"></a>

## Use googleSearch for grounding

```javascript
function myFunction() {
  const apiKey = "###"; // Please set your API key.

  const q = "Who is Kanshi Tanaike?";
  const g = new GeminiWithFiles.geminiWithFiles(
    {
      apiKey,
      exportRawData: true,
      model: "models/gemini-2.0-flash-exp",
      tools: [{ googleSearch: {} }],
    });
  const res = g.generateContent({ q });
  console.log(res.candidates[0].content)
  console.log(res.candidates[0].groundingMetadata)
}
```

When this function is run, the text generated with the grouding of Google search by Gemini API is shown in the log.

<a name="generateimage"></a>

## Generate image

```javascript
function myFunction() {
  const apiKey = "###"; // Please set your API key.

  const q = "Create an image of an apple.";
  const g = new GeminiWithFiles.geminiWithFiles(
    {
      apiKey,
      exportRawData: true,
      model: "models/gemini-2.0-flash-exp",
      generationConfig: { responseModalities: ["TEXT", "IMAGE"] },
    });
  const res = g.generateContent({ q });
  console.log(res)

  const imageObj = res.candidates[0].content.parts.find(e => e.inlineData);
  const imageBlob = Utilities.newBlob(Utilities.base64Decode(imageObj.inlineData.data), imageObj.inlineData.mimeType);
  DriveApp.createFile(imageBlob.setName("sample"));
}
```

When this function is run, an image generated by Gemini API is created in the root folder.

# IMPORTANT

- If an error occurs, please try again after several minutes.
- In generative AI, the output is highly dependent on the input prompt (the question you provide). Therefore, if the generated text doesn't meet your expectations, try reformulating your prompt and try again.
- On April 26, 2024, the following mimeTypes can be used with generateContent. [Ref](https://ai.google.dev/gemini-api/docs/prompting_with_media?hl=en#supported_file_formats) I believe that this will be expanded in the future update. For example, I believe that PDF data can be directly used with generateContent in the future.
	- This has been achieved. [Ref](https://medium.com/google-cloud/gemini-api-revolutionizing-content-generation-with-direct-pdf-input-105493780fa4)
- Images: `image/png,image/jpeg,image/webp,image/heic,image/heif`
- Videos: `audio/wav,audio/mp3,audio/aiff,audio/aac,audio/ogg,audio/flac`
- In my test, when the files are uploaded using this script, I confirmed that 100 files can be always uploaded. But, when the number of files is more than 100, an error of `Exceeded maximum execution time` sometimes occurs. Please be careful about this.

# Expectations for future updates

I have already proposed the following future requests to the Google issue tracker. [Ref](https://issuetracker.google.com/issues/336842930)

- I think it would be even more beneficial for users of Gemini if files on Google Drive could be directly used by the Gemini API using just their file IDs. This would also significantly reduce the cost of uploading data.

- I think that the ability to include custom metadata with uploaded files would be very useful for managing large numbers of files.

# Note

- When I tested the function calling for controlling the output format, I sometimes got an error of the status code 500. But, when I tested `response_mime_type`, such an error rarely occurred. I'm not sure whether this is the current specification.

- The top abstract image was created by [Gemini](https://gemini.google.com/) from the section of "Description".

---

<a name="licence"></a>

# Licence

[MIT](LICENCE)

<a name="author"></a>

# Author

[Tanaike](https://tanaikech.github.io/about/)

[Donate](https://tanaikech.github.io/donate/)

<a name="updatehistory"></a>

# Update History

- v1.0.0 (April 26, 2024)

  1. Initial release.

- v1.0.1 (May 2, 2024)

  1. `response_mime_type` got to be able to be used for controlling the output format. [Ref](#samplesresponsemimetype)

- v1.0.2 (May 7, 2024)

  1. For generating content, `parts` was added. From this version, you can select one of `q`, `jsonSchema`, and `parts`.
  2. From this version, `systemInstruction` can be used.
  3. In order to call the function call, `toolConfig` was added to the request body.

- v1.0.3 (May 17, 2024)

  1. Bugs were removed.

- v1.0.4 (May 29, 2024)

  1. Recently, when `model.countToken` is used with the uploaded files, I confirmed that an error like `You do not have permission to access the File ### or it may not exist.` occurred. In order to handle this issue, I modified the library.
  2. In order to use the movie files for generateContent, I modified the library. [Ref](#generatecontentwithamoviefile)

- v1.0.5 (June 7, 2024)

  1. Spelling mistakes in the warning message were modified. The wait time for changing the value of state for the movie file is changed from 5 seconds to 10 seconds per cycle.

- v1.0.6 (June 15, 2024)

  1. Included the script of [PDFApp](https://github.com/tanaikech/PDFApp) in this library.

- v1.0.7 (July 4, 2024)

  1. From this version, when `doCountToken: true` and `exportTotalTokens: true` are used in the object of the argument of `geminiWithFiles`, the total tokens are returned. In this case, the returned value is an object like `{returnValue: "###", totalTokens: ###}`.

- v2.0.0 (August 3, 2024)

  1. From this version, the following changes were made.
    - PDF data can be directly used. [Ref](https://medium.com/google-cloud/gemini-api-revolutionizing-content-generation-with-direct-pdf-input-105493780fa4) By this, PDFApp is not required to be used. By this, the script can be used without async/await.
    - As the default, `functions: {}` is used. So, the default function calling was removed. Because in the current stage, JSON output can be easily returned using a JSON schema and `response_mime_type`. [Ref](https://medium.com/google-cloud/gemini-api-with-json-schema-3dbdabac7d19) [Ref](https://medium.com/google-cloud/taming-the-wild-output-effective-control-of-gemini-api-response-formats-with-response-mime-type-da273c08be85)
    - The default model was changed from `models/gemini-1.5-pro-latest` to `models/gemini-1.5-flash-latest`.
    - The export values with `exportTotalTokens` were changed. After v2.x.x, when this is true, the object `usageMetadata` including `promptTokenCount`, `candidatesTokenCount`, `totalTokenCount` is exported. At that time, the generated content and `usageMetadata` are returned as an object.
    - After v2.x.x, the large files can be uploaded to Gemini. This is from [this respository](https://github.com/tanaikech/UploadApp) and [this post](https://medium.com/google-cloud/uploading-large-files-to-gemini-with-google-apps-script-overcoming-50-mb-limit-6ea63204ee81).

- v2.0.1 (August 4, 2024)

  1. From this version, `codeExecution` can be used. [Ref](#usecodeexecution)

- v2.0.2 (September 26, 2024)

  1. As the option for `generationConfig`, the properties `response_schema` and `temperature` were added.

<a name="v203"></a>

- v2.0.3 (November 19, 2024)

  1. I modified the specification of `setFileIdsOrUrlsWithResumableUpload`. From v2.0.3, when you use this method, please include `propertiesService: PropertiesService.getScriptProperties()` into the initial object as follows. Because, when `PropertiesService.getScriptProperties()` is used in the library, the values are put into the library. When I created [Ref](https://github.com/tanaikech/UploadApp) and [Ref](https://medium.com/google-cloud/uploading-large-files-to-gemini-with-google-apps-script-overcoming-50-mb-limit-6ea63204ee81), I supposed that the script is used by copying and pasting instead of the library. So, I included `PropertiesService.getScriptProperties()` in the script. But I noticed that when this is used with GeminiWithFiles, each user is required to use `PropertiesService.getScriptProperties()`. So, I modified this.
  2. As an additional option, when you want to upload the data with the resumable upload as a new upload, please set `resumableUploadAsNewUpload: true`. [Ref](https://github.com/tanaikech/GeminiWithFiles?tab=readme-ov-file#setfileidsorurlswithresumableupload) By this, the property is cleared and the upload is run.

<a name="v204"></a>

- v2.0.4 (March 15, 2025)

  1. Property `generationConfig` was added to the method `geminiWithFiles`. By this, you can use all properties for `generationConfig`. [Ref](https://ai.google.dev/api/generate-content#v1beta.GenerationConfig) You can see the sample scripts at "[Use googleSearch for grounding](#usegooglesearch)" and "[Generate image](#generateimage)".

<a name="v205"></a>

- v2.0.5 (March 19, 2025)

  1. A new method `chat` was added. [Ref](#chat) When this method is used, you can generate content with Gemini API through the chat.
  2. The default model was changed from `models/gemini-1.5-flash-latest` to `models/gemini-2.0-flash`.

<a name="v206"></a>

- v2.0.6 (April 23, 2025)

  1. A new method `countTokens` was added. [Ref](#counttokens) When this method is used, you can count tokens of the request.

[TOP](#top)
