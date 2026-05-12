import { useState, useEffect, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import TaskList from '@tiptap/extension-task-list'
import TaskItem from '@tiptap/extension-task-item'
import Placeholder from '@tiptap/extension-placeholder'
import { fetchNotes, createNote, updateNote, deleteNote } from '../api/notes'
import type { Note } from '../types'

function formatDate(iso: string): string {
  const d = new Date(iso)
  const now = new Date()
  const diff = now.getTime() - d.getTime()
  if (diff < 60000) return 'Just now'
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function Divider() {
  return <div className="w-px h-4 bg-gray-200 dark:bg-od-600 mx-0.5 flex-shrink-0" />
}

function TBtn({ active, title, onClick, children }: {
  active: boolean; title: string; onClick: () => void; children: React.ReactNode
}) {
  return (
    <button type="button" title={title}
      onMouseDown={e => { e.preventDefault(); onClick() }}
      className={`px-2 py-1 rounded text-xs font-medium transition-colors select-none ${
        active ? 'bg-gray-200 dark:bg-od-700 text-gray-900 dark:text-od-100' : 'text-gray-400 dark:text-od-400 hover:bg-gray-100 dark:hover:bg-od-700 hover:text-gray-700 dark:hover:text-od-100'
      }`}>
      {children}
    </button>
  )
}

interface EditorPaneProps {
  note: Note
  onSaved: (updated: Note) => void
  onDelete: () => void
}

function EditorPane({ note, onSaved, onDelete }: EditorPaneProps) {
  const [title, setTitle] = useState(note.title)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle')
  const [confirmDelete, setConfirmDelete] = useState(false)
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const contentLoaded = useRef(false)

  function scheduleSave(patch: Partial<Note>) {
    setSaveStatus('idle')
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(async () => {
      try {
        setSaveStatus('saving')
        const saved = await updateNote(note.id, patch)
        onSaved(saved)
        setSaveStatus('saved')
      } catch {
        setSaveStatus('idle')
      }
    }, 1000)
  }

  function handleTitleChange(val: string) {
    setTitle(val)
    scheduleSave({ title: val })
  }

  const editor = useEditor({
    extensions: [
      StarterKit,
      TaskList,
      TaskItem.configure({ nested: true }),
      Placeholder.configure({ placeholder: 'Write something…' }),
    ],
    content: '',
    onUpdate: ({ editor }) => {
      const content = JSON.stringify(editor.getJSON())
      scheduleSave({ content })
    },
  })

  useEffect(() => {
    if (!editor || contentLoaded.current) return
    contentLoaded.current = true
    try {
      editor.commands.setContent(note.content ? JSON.parse(note.content) : '', { emitUpdate: false })
    } catch {
      editor.commands.setContent(note.content || '', { emitUpdate: false })
    }
  }, [editor])

  if (!editor) return null

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Title row */}
      <div className="flex items-center gap-3 px-6 pt-6 pb-3 flex-shrink-0">
        <input
          value={title}
          onChange={e => handleTitleChange(e.target.value)}
          placeholder="Untitled"
          className="flex-1 text-xl font-bold text-gray-900 dark:text-od-100 bg-transparent border-none outline-none placeholder:text-gray-300 dark:placeholder:text-od-600"
        />
        <span className={`text-[11px] transition-opacity duration-300 flex-shrink-0 ${
          saveStatus === 'saving' ? 'text-gray-400 dark:text-od-500 opacity-100'
          : saveStatus === 'saved' ? 'text-emerald-500 opacity-100'
          : 'opacity-0'
        }`}>
          {saveStatus === 'saving' ? 'Saving…' : '✓ Saved'}
        </span>
        {confirmDelete ? (
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className="text-xs text-gray-500 dark:text-od-400">Delete note?</span>
            <button onClick={onDelete}
              className="px-2.5 py-1 bg-red-500 text-white rounded-lg text-xs font-semibold hover:bg-red-600 transition-colors">
              Delete
            </button>
            <button onClick={() => setConfirmDelete(false)}
              className="px-2.5 py-1 bg-gray-100 dark:bg-od-700 text-gray-600 dark:text-od-300 rounded-lg text-xs font-semibold hover:bg-gray-200 dark:hover:bg-od-600 transition-colors">
              Cancel
            </button>
          </div>
        ) : (
          <button onClick={() => setConfirmDelete(true)}
            className="w-8 h-8 flex items-center justify-center rounded-xl text-gray-300 dark:text-od-600 hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors flex-shrink-0"
            title="Delete note">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
              <path d="M10 11v6M14 11v6" />
              <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
            </svg>
          </button>
        )}
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-0.5 px-4 py-2 border-y border-gray-100 dark:border-od-700 flex-shrink-0 flex-wrap bg-white dark:bg-od-800">
        <TBtn active={editor.isActive('heading', { level: 1 })} title="Heading 1"
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}>H1</TBtn>
        <TBtn active={editor.isActive('heading', { level: 2 })} title="Heading 2"
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>H2</TBtn>
        <Divider />
        <TBtn active={editor.isActive('bold')} title="Bold"
          onClick={() => editor.chain().focus().toggleBold().run()}><strong>B</strong></TBtn>
        <TBtn active={editor.isActive('italic')} title="Italic"
          onClick={() => editor.chain().focus().toggleItalic().run()}><em>I</em></TBtn>
        <TBtn active={editor.isActive('strike')} title="Strikethrough"
          onClick={() => editor.chain().focus().toggleStrike().run()}><s>S</s></TBtn>
        <Divider />
        <TBtn active={editor.isActive('bulletList')} title="Bullet list"
          onClick={() => editor.chain().focus().toggleBulletList().run()}>• List</TBtn>
        <TBtn active={editor.isActive('orderedList')} title="Numbered list"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}>1. List</TBtn>
        <TBtn active={editor.isActive('taskList')} title="To-do list"
          onClick={() => editor.chain().focus().toggleTaskList().run()}>
          <span className="flex items-center gap-1">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 11 12 14 22 4" />
              <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
            </svg>
            Todo
          </span>
        </TBtn>
      </div>

      {/* Editor area */}
      <div className="flex-1 overflow-y-auto px-6 py-4 editor-content cursor-text bg-white dark:bg-od-800"
        onClick={() => editor.commands.focus()}>
        <EditorContent editor={editor} />
      </div>
    </div>
  )
}

export default function NotesPage() {
  const qc = useQueryClient()
  const [selectedId, setSelectedId] = useState<number | null>(null)

  const { data: notes = [] } = useQuery({
    queryKey: ['notes'],
    queryFn: fetchNotes,
  })

  const createMutation = useMutation({
    mutationFn: createNote,
    onSuccess: (note) => {
      qc.invalidateQueries({ queryKey: ['notes'] })
      setSelectedId(note.id)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteNote(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notes'] })
      setSelectedId(null)
    },
  })

  function handleSaved(updated: Note) {
    qc.setQueryData<Note[]>(['notes'], old =>
      old ? old.map(n => n.id === updated.id ? updated : n).sort(
        (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
      ) : [updated]
    )
  }

  const selectedNote = notes.find(n => n.id === selectedId) ?? null

  return (
    <div className="flex h-full overflow-hidden">
      {/* Left sidebar */}
      <div className="w-64 flex-shrink-0 bg-gray-50 dark:bg-od-800 border-r border-gray-200 dark:border-od-600 flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-4 py-4 flex-shrink-0 border-b border-gray-100 dark:border-od-700">
          <h2 className="text-sm font-bold text-gray-900 dark:text-od-100">Notes</h2>
          <button
            onClick={() => createMutation.mutate()}
            disabled={createMutation.isPending}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold transition-colors disabled:opacity-40"
          >
            <span className="text-base leading-none">+</span> New
          </button>
        </div>
        <div className="flex-1 overflow-y-auto py-1">
          {notes.length === 0 && (
            <p className="text-xs text-gray-400 dark:text-od-500 px-4 py-6 text-center">No notes yet</p>
          )}
          {notes.map(note => (
            <button
              key={note.id}
              onClick={() => setSelectedId(note.id)}
              className={`w-full text-left px-4 py-3 transition-colors border-b border-gray-100 dark:border-od-700/50 ${
                selectedId === note.id
                  ? 'bg-blue-50 dark:bg-blue-900/20 border-l-2 border-l-blue-500'
                  : 'hover:bg-gray-100 dark:hover:bg-od-700'
              }`}
            >
              <p className={`text-sm font-medium truncate ${
                note.title ? 'text-gray-900 dark:text-od-100' : 'text-gray-400 dark:text-od-500 italic'
              }`}>
                {note.title || 'Untitled'}
              </p>
              <p className="text-[11px] text-gray-400 dark:text-od-500 mt-0.5">{formatDate(note.updated_at)}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Right pane */}
      <div className="flex-1 overflow-hidden bg-white dark:bg-od-800">
        {selectedNote ? (
          <EditorPane
            key={selectedNote.id}
            note={selectedNote}
            onSaved={handleSaved}
            onDelete={() => deleteMutation.mutate(selectedNote.id)}
          />
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-16 h-16 bg-gray-100 dark:bg-od-700 rounded-2xl flex items-center justify-center mb-4">
              <svg className="w-7 h-7 text-gray-300 dark:text-od-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <p className="text-base font-semibold text-gray-400 dark:text-od-400">Select a note or create one</p>
          </div>
        )}
      </div>
    </div>
  )
}
