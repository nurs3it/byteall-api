import { useEditor, EditorContent } from '@tiptap/react';
import { useEffect } from 'react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import Underline from '@tiptap/extension-underline';
import { Button, Upload, Space, Divider, message } from 'antd';
import {
  BoldOutlined, ItalicOutlined, UnderlineOutlined,
  OrderedListOutlined, UnorderedListOutlined, LinkOutlined, PictureOutlined,
} from '@ant-design/icons';
import { useApiUrl } from '@refinedev/core';
import axios from 'axios';

interface RichTextEditorProps {
  value?: string;
  onChange?: (value: string) => void;
}

export const RichTextEditor = ({ value, onChange }: RichTextEditorProps) => {
  const apiUrl = useApiUrl();

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      Link.configure({ openOnClick: false }),
      Image.configure({ allowBase64: false }),
    ],
    content: value ?? '',
    onUpdate: ({ editor }) => {
      onChange?.(editor.getHTML());
    },
  });

  useEffect(() => {
    if (editor && value !== undefined && editor.getHTML() !== value) {
      editor.commands.setContent(value);
    }
  }, [editor, value]);

  if (!editor) return null;

  const uploadImage = async (file: File) => {
    const token = localStorage.getItem('access_token');
    const formData = new FormData();
    formData.append('file', file);
    try {
      const { data } = await axios.post(`${apiUrl}/uploads/image?folder=content`, formData, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' },
      });
      const url = data?.data?.url ?? data?.url;
      if (url) editor.chain().focus().setImage({ src: url }).run();
    } catch {
      void message.error('Не удалось загрузить изображение');
    }
    return false; // prevent default upload
  };

  return (
    <div style={{ border: '1px solid #d9d9d9', borderRadius: 6, overflow: 'hidden' }}>
      {/* Toolbar */}
      <div style={{ padding: '8px 12px', borderBottom: '1px solid #d9d9d9', background: '#fafafa' }}>
        <Space wrap size={4}>
          <Button
            size="small" type={editor.isActive('bold') ? 'primary' : 'default'}
            icon={<BoldOutlined />}
            onClick={() => editor.chain().focus().toggleBold().run()}
          />
          <Button
            size="small" type={editor.isActive('italic') ? 'primary' : 'default'}
            icon={<ItalicOutlined />}
            onClick={() => editor.chain().focus().toggleItalic().run()}
          />
          <Button
            size="small" type={editor.isActive('underline') ? 'primary' : 'default'}
            icon={<UnderlineOutlined />}
            onClick={() => editor.chain().focus().toggleUnderline().run()}
          />
          <Divider type="vertical" />
          {['1', '2', '3'].map((level) => (
            <Button
              key={level} size="small"
              type={editor.isActive('heading', { level: Number(level) }) ? 'primary' : 'default'}
              onClick={() => editor.chain().focus().toggleHeading({ level: Number(level) as 1|2|3 }).run()}
            >
              H{level}
            </Button>
          ))}
          <Divider type="vertical" />
          <Button
            size="small" type={editor.isActive('bulletList') ? 'primary' : 'default'}
            icon={<UnorderedListOutlined />}
            onClick={() => editor.chain().focus().toggleBulletList().run()}
          />
          <Button
            size="small" type={editor.isActive('orderedList') ? 'primary' : 'default'}
            icon={<OrderedListOutlined />}
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
          />
          <Divider type="vertical" />
          <Button
            size="small" icon={<LinkOutlined />}
            onClick={() => {
              const url = window.prompt('URL ссылки');
              if (url && url.trim()) {
                editor.chain().focus().setLink({ href: url.trim() }).run();
              }
            }}
          />
          <Upload showUploadList={false} beforeUpload={uploadImage} accept="image/*">
            <Button size="small" icon={<PictureOutlined />} />
          </Upload>
        </Space>
      </div>
      {/* Editor */}
      <EditorContent
        editor={editor}
        style={{ padding: '12px 16px', minHeight: 300, outline: 'none' }}
      />
    </div>
  );
};
