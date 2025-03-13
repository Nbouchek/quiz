import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// Get the directory name
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path to the file we need to modify
const filePath = path.join(
  __dirname,
  "services",
  "study-service",
  "src",
  "pkg",
  "handlers",
  "quiz_attempt_handler.go"
);

console.log(`Reading file: ${filePath}`);
const content = fs.readFileSync(filePath, "utf8");

// Look for the pattern of the client override
const clientOverridePattern =
  /finalIsCorrect := actuallyCorrect\s+if jsonInput\.IsCorrect != nil {[\s\S]+?finalIsCorrect = \*jsonInput\.IsCorrect/;

// Replace with direct always-use-server code
const replacement = `finalIsCorrect := actuallyCorrect
	// Client input is ignored - always use server verification
	if jsonInput.IsCorrect != nil {
		// Log but ignore client input
		log.Printf("DEBUG: Client provided isCorrect=%v but using server verification: %v", *jsonInput.IsCorrect, actuallyCorrect)`;

// Apply the replacement
let newContent;
if (clientOverridePattern.test(content)) {
  console.log("Found client override pattern, replacing...");
  newContent = content.replace(clientOverridePattern, replacement);
} else {
  console.log(
    "Client override pattern not found, looking for simpler pattern..."
  );
  // Try a simpler pattern
  const simplePattern = /finalIsCorrect := actuallyCorrect/;

  if (simplePattern.test(content)) {
    console.log("Found simple pattern, adding log statement...");
    const simpleReplacement = `finalIsCorrect := actuallyCorrect
	log.Printf("DEBUG: Server verification result: isCorrect=%v for answer '%s'", actuallyCorrect, input.Answer)
	// Ignore any client-provided isCorrect`;

    newContent = content.replace(simplePattern, simpleReplacement);
  } else {
    console.error("Could not find any pattern to replace");
    process.exit(1);
  }
}

// Write back to the file
console.log("Writing changes to file...");
fs.writeFileSync(filePath, newContent);
console.log("File updated successfully");
