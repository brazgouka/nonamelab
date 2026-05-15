import { useEffect, useRef, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import TaskList from '@tiptap/extension-task-list'
import TaskItem from '@tiptap/extension-task-item'
import Placeholder from '@tiptap/extension-placeholder'
import { TextStyle } from '@tiptap/extension-text-style'
import { Color } from '@tiptap/extension-color'
import Link from '@tiptap/extension-link'
import { fetchPeriodNote, savePeriodNote } from '../api/periodNotes'
import ColorDropdown from './ColorDropdown'

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']

interface Props {
  year: number
  month: number | null
  week?: number | null
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

export default function PeriodEditor({ year, month, week }: Props) {
  const qc = useQueryClient()
  const noteKey = ['period-note', year, month, week ?? null]
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle')
  const [linkUrl, setLinkUrl] = useState('')
  const [showLinkInput, setShowLinkInput] = useState(false)
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastSeenUpdatedAt = useRef<string | null>(null)

  const { data: note } = useQuery({
    queryKey: noteKey,
    queryFn: () => fetchPeriodNote(year, month, week),
  })

  const editor = useEditor({
    extensions: [
      StarterKit,
      TaskList,
      TaskItem.extend({ draggable: true }).configure({ nested: true }),
      Placeholder.configure({
        placeholder: week != null
          ? `Write something for Week ${week}, ${year}…`
          : `Write something for ${month != null ? MONTHS[month - 1] + ' ' : ''}${year}…`,
      }),
      TextStyle,
      Color,
      Link.configure({ openOnClick: false, HTMLAttributes: { target: '_blank', rel: 'noopener noreferrer' } }),
    ],
    content: '',
    onUpdate: ({ editor }) => {
      setSaveStatus('idle')
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
      saveTimerRef.current = setTimeout(async () => {
        try {
          setSaveStatus('saving')
          const content = JSON.stringify(editor.getJSON())
          const saved = await savePeriodNote(year, month, content, week)
          qc.setQueryData(noteKey, saved)
          setSaveStatus('saved')
        } catch {
          setSaveStatus('idle')
        }
      }, 1000)
    },
  })

  useEffect(() => {
    if (!editor || note === undefined) return
    if (note.updated_at === lastSeenUpdatedAt.current) return
    const editorJson = JSON.stringify(editor.getJSON())
    if (editorJson === note.content) { lastSeenUpdatedAt.current = note.updated_at; return }
    lastSeenUpdatedAt.current = note.updated_at
    try {
      editor.commands.setContent(note.content ? JSON.parse(note.content) : '', { emitUpdate: false })
    } catch {
      editor.commands.setContent(note.content || '', { emitUpdate: false })
    }
  }, [editor, note])

  if (!editor) return null

  function openLinkInput() {
    setLinkUrl(editor!.getAttributes('link').href ?? '')
    setShowLinkInput(true)
  }

  function applyLink() {
    const url = linkUrl.trim()
    if (url) editor!.chain().focus().setLink({ href: url }).run()
    else editor!.chain().focus().unsetLink().run()
    setShowLinkInput(false)
    setLinkUrl('')
  }

  function cancelLink() {
    setShowLinkInput(false)
    setLinkUrl('')
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex items-center gap-0.5 px-4 py-2 border-b border-gray-100 dark:border-od-600 flex-shrink-0 flex-wrap bg-white dark:bg-od-800">
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
        <Divider />

        <ColorDropdown
          activeColor={editor.getAttributes('textStyle').color ?? null}
          onSelect={color => {
            if (color) editor.chain().focus().setColor(color).run()
            else editor.chain().focus().unsetColor().run()
          }}
        />
        <Divider />

        {showLinkInput ? (
          <div className="flex items-center gap-1">
            <input
              value={linkUrl}
              onChange={e => setLinkUrl(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') { e.preventDefault(); applyLink() }
                if (e.key === 'Escape') cancelLink()
              }}
              placeholder="https://…"
              autoFocus
              className="text-xs border border-gray-200 dark:border-od-600 rounded px-2 py-0.5 bg-white dark:bg-od-800 text-gray-700 dark:text-od-200 outline-none focus:ring-1 focus:ring-blue-400 w-44"
            />
            <button onMouseDown={e => { e.preventDefault(); applyLink() }}
              className="text-xs px-2 py-0.5 bg-blue-500 text-white rounded hover:bg-blue-600">✓</button>
            <button onMouseDown={e => { e.preventDefault(); cancelLink() }}
              className="text-xs px-1.5 py-0.5 text-gray-400 hover:text-gray-600 dark:hover:text-od-200">✕</button>
          </div>
        ) : (
          <TBtn active={editor.isActive('link')} title="Link"
            onClick={() => editor.isActive('link') ? editor.chain().focus().unsetLink().run() : openLinkInput()}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
              <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
            </svg>
          </TBtn>
        )}

        <div className="flex-1" />
        <span className={`text-[11px] transition-opacity duration-300 ${
          saveStatus === 'saving' ? 'text-gray-400 opacity-100'
          : saveStatus === 'saved' ? 'text-emerald-500 opacity-100'
          : 'opacity-0'
        }`}>
          {saveStatus === 'saving' ? 'Saving…' : '✓ Saved'}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-4 editor-content cursor-text bg-white dark:bg-od-800"
        onClick={() => editor.commands.focus()}>
        <EditorContent editor={editor} />
      </div>
    </div>
  )
}
