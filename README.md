# TaskKeep Chat

TaskKeep Chat is a web application that helps you manage your Google Tasks with an integrated AI chat assistant. It provides a clean interface to view, search, and manage your tasks, and uses a powerful chat interface to interact with your data in a conversational way.

## Features

- **Google Tasks Integration**: Securely connect your Google account and sync your task lists and tasks.
- **Task Management**: View your tasks, separated into pending and completed. Delete tasks directly from the interface.
- **Search**: Quickly find tasks by searching through titles and notes.
- **AI Chat**: Interact with your tasks using a conversational AI.
- **Offline Caching**: Tasks are stored locally in your browser for fast access and offline availability.
- **Clean UI**: A modern and responsive user interface built with React and Tailwind CSS.

## Development Setup

Follow these instructions to get a local copy up and running for development and testing purposes.

### Prerequisites

- [Node.js](https://nodejs.org/) (v18 or newer)
- [npm](https://www.npmjs.com/) (usually comes with Node.js)

### Installation and Setup

1.  **Install dependencies:**

    From the root of the project directory, run:
    ```bash
    npm install
    ```

2.  **Set up environment variables:**

    The application uses Google OAuth for authentication. You need to create a Google Client ID for a Web Application from the [Google Cloud Console](https://console.cloud.google.com/apis/credentials).

    Create a file named `.env` in the root of the project and add your Google Client ID:

    ```
    VITE_GOOGLE_CLIENT_ID="YOUR_GOOGLE_CLIENT_ID_HERE"
    ```

    Make sure to configure the Authorized JavaScript origins in your Google Cloud credential settings to match your development environment (e.g., `http://localhost:5173`).

3.  **Run the development server:**

    ```bash
    npm run dev
    ```

    This will start the Vite development server. You can now view the application in your browser at the local URL provided (usually `http://localhost:5173`).

## How to Use the App

1.  **Login**: Open the application and you'll be prompted to log in with your Google account.
2.  **Connect/Sync Google**: After logging in, click on the "Connect Google" or "Sync Google" button. This will fetch your task lists and tasks from the Google Tasks API.
3.  **View Tasks**: Your tasks will be displayed on the "Tasks" tab, separated into "Pending" and "Completed" sections. You can see task details like title, notes, and due date.
4.  **Search**: Use the search bar at the top to filter tasks by keywords.
5.  **Delete a Task**: Click the trash icon on a task card to delete it. This action will be synced with your Google Tasks.
6.  **AI Chat**: Navigate to the "AI Chat" tab to interact with the chatbot.
7.  **Logout**: Click on your user email at the top right to open the user menu, where you can sign out.
