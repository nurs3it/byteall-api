import { useEffect, useRef } from 'react';
import EditorJS, { OutputData } from '@editorjs/editorjs';
import Header from '@editorjs/header';
import List from '@editorjs/list';
import Checklist from '@editorjs/checklist';
import Quote from '@editorjs/quote';
import CodeTool from '@editorjs/code';
import RawTool from '@editorjs/raw';
import ImageTool from '@editorjs/image';
import AttachesTool from '@editorjs/attaches';
import Table from '@editorjs/table';
import Embed from '@editorjs/embed';
import Delimiter from '@editorjs/delimiter';
import Warning from '@editorjs/warning';
import LinkTool from '@editorjs/link';
import Marker from '@editorjs/marker';
import Underline from '@editorjs/underline';
import InlineCode from '@editorjs/inline-code';
import ColorPlugin from 'editorjs-text-color-plugin';
import DragDrop from 'editorjs-drag-drop';
import Undo from 'editorjs-undo';
import ChangeCase from 'editorjs-change-case';
import Paragraph from 'editorjs-paragraph-with-alignment';
import { useApiUrl } from '@refinedev/core';

interface RichTextEditorProps {
  value?: string;
  onChange?: (value: string) => void;
}

const parseValue = (value?: string): OutputData | undefined => {
  if (!value) return undefined;
  try {
    const parsed = JSON.parse(value);
    if (parsed?.blocks) return parsed;
  } catch {}
  if (value.trim().length > 0) {
    return {
      time: Date.now(),
      blocks: [{ type: 'paragraph', data: { text: value, alignment: 'left' } }],
      version: '2.31.5',
    };
  }
  return undefined;
};

export const RichTextEditor = ({ value, onChange }: RichTextEditorProps) => {
  const apiUrl = useApiUrl();
  const holderRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<EditorJS | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    if (!holderRef.current || editorRef.current) return;

    const token = () => localStorage.getItem('access_token');

    const editor = new EditorJS({
      holder: holderRef.current,
      placeholder: 'Нажмите «+» или начните вводить текст...',
      data: parseValue(value),
      autofocus: false,

      tools: {
        // ── Текст ────────────────────────────────────────────────────
        paragraph: {
          class: Paragraph as any,
          inlineToolbar: true,
          config: { placeholder: 'Введите текст...' },
        },

        // ── Заголовки ─────────────────────────────────────────────
        header: {
          class: Header as any,
          inlineToolbar: true,
          config: { levels: [1, 2, 3, 4, 5, 6], defaultLevel: 2 },
          shortcut: 'CMD+SHIFT+H',
        },

        // ── Списки ───────────────────────────────────────────────
        list: {
          class: List as any,
          inlineToolbar: true,
          config: { defaultStyle: 'unordered' },
        },
        checklist: {
          class: Checklist as any,
          inlineToolbar: true,
        },

        // ── Медиа ─────────────────────────────────────────────────
        image: {
          class: ImageTool as any,
          config: {
            endpoints: {
              byFile: `${apiUrl}/uploads/editorjs?folder=content`,
              byUrl: `${apiUrl}/uploads/editorjs-url?folder=content`,
            },
            additionalRequestHeaders: { Authorization: `Bearer ${token()}` },
            captionPlaceholder: 'Подпись к изображению',
            buttonContent: '📷 Выбрать изображение',
            uploader: {
              uploadByFile: async (file: File) => {
                const formData = new FormData();
                formData.append('image', file);
                const res = await fetch(`${apiUrl}/uploads/editorjs?folder=content`, {
                  method: 'POST',
                  headers: { Authorization: `Bearer ${token()}` },
                  body: formData,
                });
                const json = await res.json();
                // unwrap NestJS response wrapper { data: {...}, message: 'success' }
                return json?.data ?? json;
              },
              uploadByUrl: async (url: string) => {
                const res = await fetch(`${apiUrl}/uploads/editorjs-url?folder=content`, {
                  method: 'POST',
                  headers: {
                    Authorization: `Bearer ${token()}`,
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({ url }),
                });
                const json = await res.json();
                return json?.data ?? json;
              },
            },
          },
        },

        attaches: {
          class: AttachesTool as any,
          config: {
            endpoint: `${apiUrl}/uploads/editorjs-file`,
            additionalRequestHeaders: { Authorization: `Bearer ${token()}` },
            buttonText: '📎 Прикрепить файл',
            errorMessage: 'Ошибка загрузки файла',
          },
        },

        // ── Блоки ────────────────────────────────────────────────
        quote: {
          class: Quote as any,
          inlineToolbar: true,
          shortcut: 'CMD+SHIFT+O',
          config: { quotePlaceholder: 'Введите цитату...', captionPlaceholder: 'Источник' },
        },
        warning: {
          class: Warning as any,
          inlineToolbar: true,
          shortcut: 'CMD+SHIFT+W',
          config: { titlePlaceholder: 'Заголовок', messagePlaceholder: 'Сообщение' },
        },
        code: {
          class: CodeTool as any,
          shortcut: 'CMD+SHIFT+C',
          config: { placeholder: 'Введите код...' },
        },
        raw: {
          class: RawTool as any,
          config: { placeholder: 'Вставьте HTML-код...' },
        },
        table: {
          class: Table as any,
          inlineToolbar: true,
          config: { rows: 2, cols: 3, withHeadings: true },
        },
        delimiter: {
          class: Delimiter as any,
        },

        // ── Ссылки и Embed ────────────────────────────────────────
        linkTool: {
          class: LinkTool as any,
          config: {
            endpoint: `${apiUrl}/uploads/fetch-link`,
            additionalRequestHeaders: { Authorization: `Bearer ${token()}` },
          },
        },
        embed: {
          class: Embed as any,
          config: {
            services: {
              youtube: true,
              vimeo: true,
              twitter: true,
              instagram: true,
              codepen: true,
              coub: true,
              twitch: true,
              imgur: true,
            },
          },
        },

        // ── Инлайн-инструменты ────────────────────────────────────
        marker: {
          class: Marker as any,
          shortcut: 'CMD+SHIFT+M',
        },
        underline: {
          class: Underline as any,
          shortcut: 'CMD+U',
        },
        inlineCode: {
          class: InlineCode as any,
          shortcut: 'CMD+SHIFT+E',
        },
        Color: {
          class: ColorPlugin as any,
          config: {
            colorCollections: [
              '#EC7878', '#9C27B0', '#673AB7', '#3F51B5',
              '#0070FF', '#03A9F4', '#00BCD4', '#4CAF50',
              '#8BC34A', '#CDDC39', '#FFF', '#000',
            ],
            defaultColor: '#FF1300',
            type: 'text',
            customPicker: true,
          },
        },
        Background: {
          class: ColorPlugin as any,
          config: {
            colorCollections: [
              '#EC7878', '#9C27B0', '#673AB7', '#3F51B5',
              '#0070FF', '#03A9F4', '#00BCD4', '#4CAF50',
              '#8BC34A', '#CDDC39', '#FFF',
            ],
            defaultColor: '#FF1300',
            type: 'marker',
            customPicker: true,
          },
        },
        changeCase: {
          class: ChangeCase as any,
          config: { showLocaleOption: true, locale: 'ru' },
        },
      },

      i18n: {
        messages: {
          ui: {
            blockTunes: {
              toggler: { 'Click to tune': 'Настроить', 'or drag to move': 'или перетащить' },
            },
            inlineToolbar: { converter: { 'Convert to': 'Преобразовать в' } },
            toolbar: { toolbox: { Add: 'Добавить', Filter: 'Поиск', 'Nothing found': 'Ничего не найдено' } },
            popover: { Filter: 'Поиск', 'Nothing found': 'Ничего не найдено', 'Convert to': 'Преобразовать в' },
          },
          toolNames: {
            Text: 'Текст',
            Heading: 'Заголовок',
            List: 'Список',
            Checklist: 'Чеклист',
            Quote: 'Цитата',
            Code: 'Код',
            'Raw HTML': 'HTML-код',
            Delimiter: 'Разделитель',
            Table: 'Таблица',
            Link: 'Ссылка',
            'Link Tool': 'Ссылка',
            Marker: 'Маркер',
            Bold: 'Жирный',
            Italic: 'Курсив',
            InlineCode: 'Инлайн-код',
            Image: 'Изображение',
            Underline: 'Подчёркнутый',
            Attaches: 'Файл',
            Warning: 'Предупреждение',
            Embed: 'Вставка',
            Color: 'Цвет текста',
            Background: 'Фон текста',
            'Change Case': 'Регистр',
          },
          tools: {
            warning: { Title: 'Заголовок', Message: 'Сообщение' },
            link: { 'Add a link': 'Добавить ссылку' },
            stub: { 'The block can not be displayed correctly.': 'Блок не может быть отображён.' },
            image: {
              Caption: 'Подпись',
              'Select an Image': 'Выбрать изображение',
              'With border': 'С рамкой',
              'Stretch image': 'Растянуть',
              'With background': 'С фоном',
            },
            code: { 'Enter a code': 'Введите код' },
            list: { Ordered: 'Нумерованный', Unordered: 'Маркированный', Checklist: 'Чеклист' },
            header: {
              'Heading 1': 'Заголовок 1', 'Heading 2': 'Заголовок 2',
              'Heading 3': 'Заголовок 3', 'Heading 4': 'Заголовок 4',
              'Heading 5': 'Заголовок 5', 'Heading 6': 'Заголовок 6',
            },
            quote: { 'Align Left': 'По левому краю', 'Align Center': 'По центру' },
            table: {
              'Add row above': 'Добавить строку выше', 'Add row below': 'Добавить строку ниже',
              'Delete row': 'Удалить строку', 'Add column left': 'Добавить столбец слева',
              'Add column right': 'Добавить столбец справа', 'Delete column': 'Удалить столбец',
              'With headings': 'С заголовками', 'Without headings': 'Без заголовков',
            },
            attaches: {
              'File title and link': 'Название файла', 'Select file to upload': 'Выбрать файл',
            },
          },
          blockTunes: {
            delete: { Delete: 'Удалить', 'Click to delete': 'Нажмите для удаления' },
            moveUp: { 'Move up': 'Переместить вверх' },
            moveDown: { 'Move down': 'Переместить вниз' },
          },
        },
      },

      onReady() {
        new DragDrop(editor);
        new Undo({ editor });
      },

      async onChange(api) {
        const outputData = await api.saver.save();
        onChangeRef.current?.(JSON.stringify(outputData));
      },
    });

    editorRef.current = editor;

    return () => {
      editor.isReady
        .then(() => {
          editorRef.current?.destroy();
          editorRef.current = null;
        })
        .catch(() => {});
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      style={{
        border: '1px solid #d9d9d9',
        borderRadius: 6,
        minHeight: 450,
        padding: '8px 0',
        background: '#fff',
      }}
    >
      <div ref={holderRef} />
    </div>
  );
};
