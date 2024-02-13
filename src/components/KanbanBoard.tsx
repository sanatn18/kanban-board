import PlusIcon from "../icons/PlusIcon";
import { useMemo, useState } from "react";
import { Column, Id, Task } from "../types";
import ColumnContainer from "./ColumnContainer";
import { DndContext, DragEndEvent, DragOverEvent, DragOverlay, DragStartEvent, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { SortableContext, arrayMove } from "@dnd-kit/sortable";
import { createPortal } from "react-dom";
import TaskCard from "./TaskCard";

function KanbanBoard() {

  const [columns, setColumns]=useState<Column[]>([]);
  const columnsId=useMemo(() => columns.map((col)=> col.id), [columns]);

  const [tasks, setTasks]=useState<Task[]>([]);
  
  const [activeColumn, setActiveColumn]= useState <Column | null>
  (null);

  const [activeTask, setActiveTask]= useState <Task | null>
  (null);

  const sensors = useSensors(
  useSensor(PointerSensor, {
    activationConstraint:{
      distance:2, //this means it will start dragging only when the distance becomes equal to 2 px
      },
    })
  );

  return (
    <div className="
        m-auto
        flex
        min-h-screen
        w-full
        items-center
        overflow-x-auto
        overflow-y-hidden 
        px-[40px]
        "
        >
          <DndContext
          onDragStart={onDragStart}
          onDragEnd={onDragEnd}
          sensors={sensors}
          onDragOver={onDragOver}
          >
            <div className="m-auto flex gap-4">   
        <div className="flex gap-4">
          <SortableContext items={columnsId}>
            {columns.map((col) => (
                <ColumnContainer
                key={col.id}
                column={col}
                deleteColumn={deleteColumn}
                updateColumn={updateColumn}
                createTask={createTask}
                deleteTask={deleteTask}
                tasks={tasks.filter(task=>task.columnId === col.id)}
                updateTask={updateTask}
                />
            ))}
          </SortableContext>
        </div> 
        <button
        onClick={()=>{
            createNewColumn();
        }}
        className="
        h-[60px]
        w-[350px]
        min-w-[350px]
        cursor-pointer
        rounded-lg
        bg-mainBackgroundColor
        border-2
        border-columnBackgroundColor
        p-4
        ring-rose-500
        hover:ring-2
        flex
        gap-2"
        
        >
            <PlusIcon/>
            Add Column
        </button>
            </div> 
            {createPortal(
            <DragOverlay>
              {activeColumn && (
              <ColumnContainer
               column={activeColumn}
               deleteColumn={deleteColumn}
               updateColumn={updateColumn}
               createTask={createTask}
               deleteTask={deleteTask}
               updateTask={updateTask}
               tasks={tasks.filter(
                (task)=>task.columnId===activeColumn.id
                )}
               />
              )}
              {activeTask &&
              <TaskCard
              task={activeTask}
              updateTask={updateTask}
              deleteTask={deleteTask}/>}
            </DragOverlay>,
            document.body
            )}
          </DndContext>
        </div>
  );

  function createNewColumn(){
    const columnToAdd:Column ={
        id: generateId(),
        title: `Column ${columns.length + 1}`,
    };

    setColumns([...columns, columnToAdd]);
    /*this will include all the previous columns too and the next one*/

  }

  function deleteColumn(id: Id){
    const filteredColumns = columns.filter((col)=> col.id != id); /*pick all the columns whose id is not the given id*/
    setColumns(filteredColumns);

    const newTasks = tasks.filter((t) => t.columnId != id);
    setTasks(newTasks); //with these 2 lines, we make sure that the task number resets once you delete a column
  }

  function updateColumn(id:Id, title:string){
    const newColumns = columns.map((col)=>{
      if(col.id!==id) return col;
      return {...col, title};
    });
    setColumns(newColumns);
  }

  function createTask(columnId: Id) {
    const newTask:Task={
      id: generateId(),
      columnId,
      content: `Task ${tasks.length + 1}`,
    };

    setTasks([...tasks, newTask]);
  }

  function deleteTask(id:Id){
    const newTasks=tasks.filter((task)=>task.id !== id);
    setTasks(newTasks);
  }

  function updateTask(id: Id, content:string){
    const newTasks=tasks.map((task)=>{
      if(task.id!==id) return task;
      return{...task, content};
    });

    setTasks(newTasks);
  }

  function onDragStart(event: DragStartEvent){
    if (event.active.data.current?.type === "Column"){
      setActiveColumn(event.active.data.current.column);
      return;
    }

    if (event.active.data.current?.type === "Task"){
      setActiveTask(event.active.data.current.task);
      return;
    }
  }

  function onDragEnd(event: DragEndEvent){
    setActiveColumn(null); //if we dont write these 2, the ENTIRE COLUMN gets dragged instead of one single task
    setActiveTask(null);

    const{active, over}=event;
    if(!over) return;

    const activeId=active.id;
    const overId=over.id;

    if (activeId === overId) return; //if the column id that youre holding on drag is equal to the overcolumnid that is the col ON WHICH you land the dragging col, return the same thing
    
    //column swapping process
    setColumns(columns => {
      const activeColumnIndex = columns.findIndex(
        (col) => col.id ===activeId
      );

      const overColumnIndex= columns.findIndex(
        (col) => col.id ===overId
      );

      return arrayMove(columns, activeColumnIndex, overColumnIndex); //arrayMove is a helper function from dndkit that swaps the activecol with overcol and returns a new array
    });
    

  }

  function onDragOver(event:DragOverEvent) {
    const{active, over}=event; //from here
    if(!over) return;
  
    const activeId=active.id;
    const overId=over.id;
  
    if (activeId === overId) return; //till here its the same as onDragEnd as they both have the same behavior
  
    const isActiveTask =active.data.current?.type==="Task";
    const isOverTask =over.data.current?.type==="Task";

    if (!isActiveTask) return; //because we want the onDrag event to work only when we are dragging the task

    //dropping a task over another task:
    if (isActiveTask && isOverTask) {
      setTasks((tasks)=>{
        const activeIndex= tasks.findIndex((t) => t.id === activeId);
        const overIndex= tasks.findIndex((t) => t.id === overId);

        tasks[activeIndex].columnId = tasks[overIndex].columnId;

        return arrayMove(tasks, activeIndex, overIndex);
      });
    }

    const isOverColumn = over.data.current?.type === "Column";
    //dropping a task over a column:
    if(isActiveTask && isOverColumn){
      setTasks((tasks)=>{
        const activeIndex= tasks.findIndex((t) => t.id === activeId);
        
        tasks[activeIndex].columnId = overId;

        return arrayMove(tasks, activeIndex, activeIndex); //we used arrayMove with same 2 indexes because with arrayMove we are triggering a RE-RENDER of our tasks since we are creating a NEW array
      });

    }
  
  }

}



function generateId(){
    /*Generate a random no between 0-1000*/
    return Math.floor(Math.random()*10001);

}

export default KanbanBoard;