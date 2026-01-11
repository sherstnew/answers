"use client";

import { Task, Test, Option } from "@/lib/types";
import {
  Card,
  CardHeader,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import katex from "katex";
import "katex/dist/katex.min.css";

interface TestPageClientProps {
  test: Test;
}

function idToText(options: Option[] | undefined, id: string, test?: Test) {
  const pick = (v: any) => (typeof v === "string" && v.trim().length > 0 ? v.trim() : undefined);
  const getTextFromOption = (opt: Option) => {
    // prefer explicit text-like fields (ignore empty strings)
    return (
      pick((opt as any).text) ||
      pick((opt as any).name) ||
      pick((opt as any).label) ||
      pick((opt as any).value) ||
      pick((opt as any).title)
    );
  };

  const getAnyRenderableFromOption = (opt: Option) => {
    // first try normal text fields
    const t = getTextFromOption(opt);
    if (t) return t;

    // then try to extract from content blocks (math, text, etc.)
    const content = (opt as any).content;
    if (Array.isArray(content)) {
      for (const c of content) {
        if (!c) continue;
        // math blocks often put the expression in `content`
        if (c.type === "content/math" && typeof c.content === "string" && c.content.trim()) {
          return c.content.trim();
        }
        if (typeof c.text === "string" && c.text.trim()) return c.text.trim();
        if (typeof c.content === "string" && c.content.trim()) return c.content.trim();
        // nested structures
        if (Array.isArray(c.content)) {
          const found = c.content.find((x: any) => typeof x === "string" && x.trim());
          if (found) return found.trim();
        }
      }
    }

    return undefined;
  };

  if (options) {
    const opt = options.find((o) => o.id === id);
    const t = opt ? getAnyRenderableFromOption(opt) : undefined;
    if (t !== undefined) return t;
  }

  // try to find in the whole test (search all tasks' answer.options)
  if (test) {
    for (const tsk of test.tasks) {
      const ans: any = tsk.test_task.answer;

      // direct options
      const opts: Option[] | undefined = ans?.options;
      if (opts) {
        const found = opts.find((o) => o.id === id);
        if (found) {
          const tf = getTextFromOption(found);
          if (tf) return tf;
        }
      }

      // text_position nested options (gap/inline etc.)
      const tp = ans?.text_position || ans?.text_positions || ans?.text_position_answer;
      if (Array.isArray(tp)) {
        for (const block of tp) {
          const blockOpts: Option[] | undefined = block?.options;
          if (!Array.isArray(blockOpts)) continue;
          const found2 = blockOpts.find((o) => o.id === id);
          if (found2) {
            const tf = getTextFromOption(found2);
            if (tf) return tf;
          }
        }
      }
    }
  }

  return id;
}

function getCorrectAnswerText(task: Task, test?: Test): string[] {
  const ans = task.test_task.answer as any;
  const type: string = ans.type;
  const options: Option[] | undefined = ans.options;

  // single choice
  if (type === "answer/single" && ans.right_answer?.id) {
    return [idToText(options, ans.right_answer.id, test)];
  }

  // string answers
  if (type === "answer/string" && Array.isArray(ans.right_answer?.string)) {
    return ans.right_answer.string;
  }

  // number answers
  if (type === "answer/number" && Array.isArray(ans.right_answer?.number)) {
    return ans.right_answer.number.map(String);
  }

  // multiple (checkboxes) -> ids array
  if (type === "answer/multiple" && Array.isArray(ans.right_answer?.ids)) {
    return ans.right_answer.ids.map((id: string) => idToText(options, id, test));
  }

  // order -> ids_order
  if ((type === "answer/order" || type === "answer/order/vertical") && Array.isArray(ans.right_answer?.ids_order)) {
    const arr = ans.right_answer.ids_order as string[];
    return arr.map((id, i) => `${i + 1}. ${idToText(options, id, test)}`);
  }

  // match -> { sourceId: [targetId] }
  if (type === "answer/match" && ans.right_answer?.match) {
    const match: Record<string, string[]> = ans.right_answer.match;
    // options contain both sources and targets; map ids to text
    const lines: string[] = [];
    for (const [source, targets] of Object.entries(match)) {
      const left = idToText(options, source, test);
      const rights = (targets || []).map((t: string) => idToText(options, t, test));
      const arrow = rights.length > 1 ? ' ↦ ' : ' → ';
      lines.push(`${left}${arrow}${rights.join(', ') || '(нет соответствий)'}`);
    }
    return lines;
  }

  // gap/match/text -> text_position_answer: [{ position_id, text_id, id }]
  if (type && type.startsWith('answer/gap') && Array.isArray(ans.right_answer?.text_position_answer)) {
    return ans.right_answer.text_position_answer.map((p: any, idx: number) => {
      const txt = idToText(options, p.id, test);
      return `${idx + 1}. ${txt}`;
    });
  }

  // inline choice single: similar to single but by text_position_answer
  if (type && type.startsWith('answer/inline') && Array.isArray(ans.right_answer?.text_position_answer)) {
    return ans.right_answer.text_position_answer.map((p: any) => idToText(options, p.id, test));
  }

  // fallback: if right_answer has ids array
  if (Array.isArray(ans.right_answer?.ids)) {
    return ans.right_answer.ids.map((id: string) => idToText(options, id, test));
  }

  // newer format: right_answer.answers -> [{ id, strings: [...] }, ...]
  if (Array.isArray(ans.right_answer?.answers)) {
    const out: string[] = [];
    for (const a of ans.right_answer.answers) {
      if (Array.isArray(a.strings)) {
        out.push(...a.strings.map((s: any) => (typeof s === 'string' ? s : String(s))));
        continue;
      }
      if (Array.isArray(a.string)) {
        out.push(...a.string.map((s: any) => (typeof s === 'string' ? s : String(s))));
        continue;
      }
      if (a.id) {
        out.push(idToText(options, a.id, test));
      }
    }
    if (out.length > 0) return out;
  }

  // table format: cells -> { "row": { "col": [text] } }
  if (type === "answer/table" && ans.right_answer?.cells) {
    const cells: Record<string, Record<string, string[]>> = ans.right_answer.cells;
    const lines: string[] = [];
    for (const [row, cols] of Object.entries(cells)) {
      for (const [col, texts] of Object.entries(cols)) {
        if (Array.isArray(texts) && texts.length > 0) {
          const rowNum = parseInt(row, 10) + 1;
          const colNum = parseInt(col, 10) + 1;
          lines.push(`Строка ${rowNum}, столбец ${colNum}:`);
          for (const t of texts) {
            lines.push(`• ${t}`);
          }
        }
      }
    }
    return lines.length > 0 ? lines : ['Нет ответов'];
  }

  // groups format: groups -> [{ group_id, options_ids: [ids] }, ...]
  if (type === "answer/groups" && ans.right_answer?.groups) {
    const groups: Array<{ group_id: string; options_ids: string[] }> = ans.right_answer.groups;
    const lines: string[] = [];
    for (const group of groups) {
      const groupText = idToText(options, group.group_id, test);
      lines.push(`${groupText}:`);
      const optionTexts = group.options_ids.map((optId: string) => idToText(options, optId, test));
      for (const optText of optionTexts) {
        lines.push(`• ${optText}`);
      }
    }
    return lines.length > 0 ? lines : ['Нет ответов'];
  }

  // unknown: dump as JSON prettified
  try {
    return [JSON.stringify(ans.right_answer || ans, null, 2)];
  } catch (e) {
    return ['Нет данных'];
  }
}

function generateCopyText(test: Test) {
  return test.name + "\n" + test.tasks
    .map((task, index) => {
      const question =
        task.test_task.question_elements[0]?.text || "Нет вопроса";
      const answers = getCorrectAnswerText(task, test);
      return `Вопрос ${index + 1}\n${question}\nОтвет\n${answers.join("\n")}`;
    })
    .join("\n\n");
}

export default function TestPageClient({ test }: TestPageClientProps) {
  // split an answer string into nicer lines: prefer splitting by semicolon, keep math intact
  const splitAnswerIntoLines = (s: string) => {
    if (!s || typeof s !== "string") return [String(s)];
    const parts = s
      .split(/;+/)
      .map((p) => p.replace(/\.+$/g, "").trim())
      .filter(Boolean);
    return parts.length > 0 ? parts : [s.trim()];
  };

  const isLatex = (s: string) => {
    if (!s || typeof s !== "string") return false;
    // heuristic: presence of backslash or common TeX tokens
    return /\\|\\frac|\\sqrt|\^|_{|\\alpha|\\beta|\\gamma/.test(s);
  };

  const renderAnswerLine = (ln: string, key: string | number) => {
    if (isLatex(ln)) {
      try {
        // render always in inline mode to avoid centering; wrap to left-align and match font size
        const html = katex.renderToString(ln, { throwOnError: false, displayMode: false });
        return (
          <div key={key} className="py-0.5 text-left" style={{ fontSize: '1rem' }} dangerouslySetInnerHTML={{ __html: html }} />
        );
      } catch (e) {
        return (
          <div key={key} className="py-0.5">
            {ln}
          </div>
        );
      }
    }
    return (
      <div key={key} className="py-0.5">
        {ln}
      </div>
    );
  };

  return (
    <div className="w-full flex flex-col gap-5 p-5">
      <Link href={'/'}>
        <Button className="w-fit">Обратно</Button>
      </Link>
      <header className="text-3xl">{test.name}</header>
      <Button
        className="w-fit"
        onClick={() => {
          navigator.clipboard.writeText(generateCopyText(test)).then(() => {
            alert("Ответы скопированы в буфер обмена");
          });
        }}
      >
        Скопировать ответы
      </Button>

      {test.tasks.map((task, index) => {
        const answers = getCorrectAnswerText(task, test);

        return (
          <Card key={index}>
            <CardHeader>Задание {index + 1}</CardHeader>
            <CardDescription className="px-6">
              {task.test_task.question_elements[0].text}
            </CardDescription>
            <CardContent>
              {answers.length > 0 ? (
                answers.map((answer, i) => {
                  // If answer contains a header ("Header: body"), render header on its own line
                  const headerMatch = typeof answer === 'string' && answer.match(/^\s*([^:]+):([\s\S]*)$/);
                  if (headerMatch) {
                    const header = headerMatch[1].trim() + ':';
                    const body = headerMatch[2].trim();
                    return (
                      <div key={i} className="py-1">
                        <div className="font-semibold mb-1">{header}</div>
                        {renderAnswerLine(body, 'body')}
                      </div>
                    );
                  }

                  const lines = splitAnswerIntoLines(answer);
                  return (
                    <div key={i} className="py-1">
                      {lines.map((ln, j) => renderAnswerLine(ln, j))}
                    </div>
                  );
                })
              ) : (
                <div>Нет ответов</div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
