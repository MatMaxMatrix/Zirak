This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

# Enhanced File Management for Virtual Workspace

This project includes several enhanced file management features for the virtual workspace:

## File Operations

### File Deletion
- Right-click on any file or directory in the file explorer to access the context menu
- Click the delete icon (trash can) that appears when hovering over files/directories
- Confirm deletion when prompted

### File Comparison with Monaco Editor
- Right-click on a file to open the context menu and select "Compare with another file"
- Alternatively, hover over a file and click the comparison icon
- Select another file to compare with from the dropdown menu
- The comparison will open in a Monaco diff editor showing differences side-by-side
- Toggle between dark and light themes using the button at the bottom of the comparison view

### Drag and Drop File Moving
- Click and drag any file (files only, not directories) to move it
- Drop the file on any directory to move it there
- The file will be moved to the target directory with its content preserved
- If the file was being edited, the editor will automatically update to the new file path

## API Endpoints

The following API endpoints support these operations:

- `DELETE /api/filesystem?path=<file_path>` - Delete a file or directory
- `GET /api/filesystem/compare?file1=<file1_path>&file2=<file2_path>` - Compare two files

## Implementation Details

- File operations use proper path normalization to handle paths with double slashes
- Robust error handling with specific error messages
- Directory creation is automatically handled when moving files
- Monaco Editor is used for syntax-highlighted diff views

## Upcoming Features

- Recursive directory moving (currently only files can be moved)
- Multi-file selection for batch operations
- File renaming directly in the file explorer

## File Synchronization Between Editor and Terminal

The application now includes a robust file synchronization system to ensure seamless integration between the web-based editor and the terminal environment.

### Automatic Synchronization

Files are automatically synchronized between the web editor and terminal in the following scenarios:
- When you save a file in the editor, it's synchronized to the terminal's working directory
- When a file is opened from either environment, it checks and synchronizes both locations

### Manual Synchronization

If you encounter any issues with file content mismatches, you can use the `sync` command in the terminal:

```bash
# Synchronize a specific file
sync filename.py

# Synchronize a file with a path
sync /project/path/to/file.py
```

This will ensure the file content is identical in both environments.

### Best Practices

1. Always save your files in the editor before running them in the terminal
2. Use the `sync` command if you modify files outside the editor
3. For important files, verify their content using `cat filename.py` in the terminal

## Troubleshooting Tailwind CSS Issues After Cloning

If you experience styling issues with Tailwind CSS after cloning this repository, follow these steps to fix them:

### Step 1: Convert Tailwind configuration to JavaScript

Create a JavaScript version of the Tailwind config file:
```bash
# Create tailwind.config.js 
# (This should replace any existing tailwind.config.ts file)
```

```javascript
/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      // Your theme configuration...
    }
  },
  plugins: [require("tailwindcss-animate"), require("@tailwindcss/typography")],
};
```

### Step 2: Update PostCSS configuration

Create or update postcss.config.js:
```javascript
module.exports = {
  plugins: {
    'tailwindcss': {},
    'autoprefixer': {},
  }
};
```

### Step 3: Install compatible dependencies

```bash
# Install compatible versions of Tailwind CSS and related packages
npm install -D tailwindcss@3.3.0 postcss autoprefixer
```

### Step 4: Clear the Next.js cache

```bash
# Delete the .next folder to clear the cache
rm -rf .next
```

### Step 5: Restart the development server

```bash
npm run dev
```

This process fixes issues related to Tailwind CSS styles not applying after cloning the repository or switching environments.
