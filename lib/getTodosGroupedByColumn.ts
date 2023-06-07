import { database } from "@/appwrite"

export const getTodosGroupedByColumn = async () => {
  const data = await database.listDocuments(process.env.NEXT_PUBLIC_DATABASEID!, process.env.NEXT_PUBLIC_COLLECTIONID!);

  const todos = data.documents;

  const columns = todos.reduce((acc, todo) => {
    if(!acc.get(todo.status)){
      acc.set(todo.status, {
        id: todo.status,
        todos: []
      })
    }
    acc.get(todo.status)!.todos.push({
      $id: todo.$id,
      $createdAt: todo.$createdAt,
      title: todo.title,
      status: todo.status,

      //get the image if it exists on the todo
      ...(todo.image && {image: JSON.parse(todo.image)})
    });

    return acc;
  }, new Map<TypeColumn, Column>())

  const columnTypes: TypeColumn[] = ["todo", "inprogress", "done"];

  for (const columnType of columnTypes) {
    if(!columns.get(columnType)){
      columns.set(columnType, {
        id: columnType,
        todos: []
      })
    }
  }

  //sort the columns by the column type
  const sortedColumns = new Map(
    Array.from(columns.entries()).sort((a, b) => columnTypes.indexOf(a[0]) - columnTypes.indexOf(b[0]))
  );

  const board: Board = {
    columns: sortedColumns
  }

  return board;
};