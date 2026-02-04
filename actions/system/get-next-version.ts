import fs from "fs";
export default async function getNextVersion() {
  try {
    // Read the package.json file synchronously
    const data = fs.readFileSync("package.json", "utf8");

    try {
      const packageJson = JSON.parse(data);
      const version = packageJson.dependencies["next"]; // Replace 'dependencies' with 'devDependencies' if Next.js is a dev dependency
      return version;
    } catch (error) {
      return "0";
    }
  } catch (error) {
    return "0";
  }
}
