import { ID, database, storage } from '@/appwrite';
import { getTodosGroupedByColumn } from '@/lib/getTodosGroupedByColumn';
import uploadImage from '@/lib/uploadImage';
import { create } from 'zustand';

interface BoardState {
  board: Board;
  getBoard: () => void;
  setBoardState: (board: Board) => void;
  updateTodoInDB: (todo: Todo, columnId: TypeColumn) => void;

  newTaskType: TypeColumn;
  setNewTaskType: (columnId: TypeColumn) => void;

  newTaskInput: string;
  setNewTaskInput: (newTaskInput: string) => void;

  searchString: string;
  setSearchString: (searchString: string) => void;

  image: File | null;
  setImage: (image: File | null) => void;

  addTask: (todo: string, columnId: TypeColumn, image: File | null) => void;
  deleteTask: (taskIndex: number, todoId: Todo, id: TypeColumn) => void;
}

export const useBoardStore = create<BoardState>((set, get) => ({
  board: {
    columns: new Map<TypeColumn, Column>(),
  },
  searchString: '',
  setSearchString: (searchString) => set({ searchString }),

  getBoard: async () => {
    const board = await getTodosGroupedByColumn();
    set({ board });
  },

  setBoardState: (board) => set({ board }),

  deleteTask: async (taskIndex: number, todo: Todo, id: TypeColumn) => {
    const newColumns = new Map(get().board.columns);

    newColumns.get(id)?.todos.splice(taskIndex, 1);

    set({ board: { columns: newColumns } });

    if (todo.image) {
      await storage.deleteFile(todo.image.bucketId, todo.image.fileId);
    }

    await database.deleteDocument(process.env.NEXT_PUBLIC_DATABASEID!, process.env.NEXT_PUBLIC_COLLECTIONID!, todo.$id);
  },

  newTaskType: 'todo',
  setNewTaskType: (columnId: TypeColumn) => set({ newTaskType: columnId }),

  newTaskInput: '',
  setNewTaskInput: (input: string) => set({ newTaskInput: input }),

  updateTodoInDB: async (todo, columnId) => {
    await database.updateDocument(process.env.NEXT_PUBLIC_DATABASEID!, process.env.NEXT_PUBLIC_COLLECTIONID!, todo.$id, {
      title: todo.title,
      status: columnId,
    });
  },

  image: null,
  setImage: (image: File | null) => set({ image }),

  addTask: async (todo: string, columnId: TypeColumn, image: File | null) => {
    let file: Image | undefined;

    if (image) {
      const fileUploaded = await uploadImage(image);
      if (fileUploaded) {
        file = {
          bucketId: fileUploaded.bucketId,
          fileId: fileUploaded.$id,
        };
      }
    }

    const { $id } = await database.createDocument(process.env.NEXT_PUBLIC_DATABASEID!, process.env.NEXT_PUBLIC_COLLECTIONID!, ID.unique(), {
      title: todo,
      status: columnId,
      //include image if it exists
      ...(file && { image: JSON.stringify(file) }),
    });

    set({ newTaskInput: '' });

    set((state) => {
      const newColumns = new Map(state.board.columns);

      const newTodo: Todo = {
        $id,
        $createdAt: new Date().toISOString(),
        title: todo,
        status: columnId,
        ...(file && { image: file }),
      };

      const column = newColumns.get(columnId);

      if (!column) {
        newColumns.set(columnId, {
          id: columnId,
          todos: [newTodo],
        });
      } else {
        newColumns.get(columnId)?.todos.push(newTodo);
      }

      return {
        board: {
          columns: newColumns,
        },
      };
    });
  },
}));
