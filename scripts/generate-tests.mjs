import { readdir, readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const testDir = path.join(root, "test_file");
const outDir = path.join(root, "src", "data");
const outFile = path.join(outDir, "tests.generated.json");

function parseTestFile(filename, content) {
  const blocks = content
    .replace(/\r\n/g, "\n")
    .trim()
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean);

  const questions = blocks.map((block, blockIndex) => {
    const lines = block
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);

    if (lines.length !== 5 || !lines[0].startsWith("? ")) {
      throw new Error(`${filename}: block ${blockIndex + 1} has invalid format`);
    }

    const answers = lines.slice(1).map((line, answerIndex) => {
      const marker = line.slice(0, 1);
      if (marker !== "+" && marker !== "-") {
        throw new Error(`${filename}: block ${blockIndex + 1}, answer ${answerIndex + 1} has invalid marker`);
      }
      return {
        id: `${blockIndex}-${answerIndex}`,
        text: line.slice(2).trim(),
        correct: marker === "+",
      };
    });

    if (answers.filter((answer) => answer.correct).length !== 1) {
      throw new Error(`${filename}: block ${blockIndex + 1} must have exactly one correct answer`);
    }

    return {
      id: `${filename}-${blockIndex + 1}`,
      text: lines[0].slice(2).trim(),
      answers,
    };
  });

  return {
    id: filename,
    title: filename.replace(/\.txt$/i, ""),
    filename,
    questionCount: questions.length,
    questions,
  };
}

async function main() {
  await mkdir(outDir, { recursive: true });
  const files = (await readdir(testDir))
    .filter((file) => file.toLowerCase().endsWith(".txt"))
    .sort((a, b) => a.localeCompare(b, "ru"));

  const tests = [];
  for (const file of files) {
    const content = await readFile(path.join(testDir, file), "utf8");
    tests.push(parseTestFile(file, content));
  }

  await writeFile(outFile, `${JSON.stringify({ generatedAt: new Date().toISOString(), tests }, null, 2)}\n`, "utf8");
  console.log(`Generated ${tests.length} test file(s) from test_file/`);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
