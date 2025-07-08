# TaskSync

TaskSync is a web application that helps you manage your Google Tasks. It provides a clean, hierarchical interface to view, search, and manage your tasks, with offline support.

## Features

- **Google Tasks Integration**: Securely connect your Google account and sync your task lists and tasks.
- **Hierarchical Task Management**: View, edit, and manage tasks and their subtasks in a clear hierarchy.
- **In-place Editing**: Directly edit task titles and notes within the task card.
- **Task Sorting and Filtering**: Sort tasks by position, date, or alphabetically. Filter tasks by task list.
- **Search**: Quickly find tasks by searching through titles and notes. Search results respect the task hierarchy.
- **Offline Caching**: Tasks are stored locally in your browser for fast access and offline availability.
- **Responsive UI**: A modern and clean user interface built with React and Tailwind CSS, with features like expandable notes.

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

1.  **Login**: Open the application and click "Continue with Google" to log in with your Google account.
2.  **Sync Google**: After logging in, click "Sync Google" to fetch your task lists and tasks from the Google Tasks API. Data is also cached locally for offline access.
3.  **View and Manage Tasks**: Your tasks will be displayed, separated into "Pending" and "Completed" sections.
    -   **Edit**: Click on a task's title or notes to edit them in-place.
    -   **Complete**: Click the circle next to a task to mark it as complete.
    -   **Delete**: Click the trash icon to delete a task.
    -   **Expand Notes**: Use the maximize/minimize icon to expand or collapse the notes area.
4.  **Navigate Tasks**:
    -   **Filter by List**: Use the tabs to view all tasks or filter by a specific task list.
    -   **Sort**: Use the sorting options to organize tasks by position, date, or alphabetically.
5.  **Search**: Use the search bar at the top to find tasks by keywords in their title or notes. Search results will maintain the task hierarchy.
6.  **Logout**: Click on your user email at the top right to open the user menu, where you can sign out.
