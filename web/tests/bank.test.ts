import { describe, expect, it } from "vitest";
import { admin, dbAvailable, grantCredit, newUser } from "./helpers";
import { driveGeneration } from "@/lib/generation/worker";
import { findBank } from "@/lib/generation/bank";
import type { AiProvider } from "@/lib/ai/types";
import { fakeProvider } from "./fake-provider";

const ok = await dbAvailable();
const d = ok ? describe : describe.skip;

const noAi: () => AiProvider = () => {
  throw new Error("La biblioteca no debe llamar a la IA");
};
// El proveedor falso numera sus preguntas: hay que reutilizar la misma instancia en todos los pasos.
const once = (p: AiProvider) => () => p;
const opecFor = () => String(Math.floor(100000 + Math.random() * 899999));

async function draft(tag: string, opec: string, withDocs: boolean, target = 20) {
  const U = await newUser(tag);
  await grantCredit(U.id);
  const a = admin();
  const { data: gen } = await a.from("generations").insert({ user_id: U.id, cargo: "Gestor I 301-01", nivel: "Profesional", opec, modalidad: "Ingreso", target_questions: target }).select("id").single();
  const id = gen!.id as string;
  if (withDocs) {
    const manual = `${U.id}/${id}/manual.pdf`;
    const ind = `${U.id}/${id}/indicadores.png`;
    await a.storage.from("documents").upload(manual, new Blob(["%PDF-1.4 manual"], { type: "application/pdf" }));
    await a.storage.from("documents").upload(ind, new Blob([new Uint8Array([0x89, 0x50, 0x4e, 0x47, 13, 10, 26, 10])], { type: "image/png" }));
    await a.from("generations").update({ manual_path: manual, manual_mime: "application/pdf", indicadores_path: ind, indicadores_mime: "image/png" }).eq("id", id);
  }
  return { U, id };
}

d("biblioteca de empleos", () => {
  it("sin banco, p_from_bank falla y no cobra", async () => {
    const { U, id } = await draft("nobank", opecFor(), false);
    const { error } = await admin().rpc("start_generation", { p_user_id: U.id, p_generation_id: id, p_from_bank: true });
    expect(error?.message).toContain("sin_biblioteca");
    expect((await U.client.rpc("my_credit_balance")).data).toBe(1);
  });

  it("una generación con IA queda en la biblioteca y el siguiente aspirante la recibe sin IA", async () => {
    const opec = opecFor();
    const first = await draft("bank1", opec, true, 20);
    await admin().rpc("start_generation", { p_user_id: first.U.id, p_generation_id: first.id });
    expect((await driveGeneration(admin(), first.id, once(fakeProvider()), 600_000)).state).toBe("completed");

    const bank = await findBank(admin(), opec);
    expect(bank?.questions).toBe(20);
    expect(bank?.ejes).toEqual(["Fiscalización tributaria", "Razonamiento matemático"]);
    // Los usuarios no pueden leer la biblioteca directamente.
    const { data: leaked } = await first.U.client.from("job_banks").select("opec").eq("opec", opec);
    expect(leaked ?? []).toHaveLength(0);

    const second = await draft("bank2", opec, false);
    const { data: started, error } = await admin().rpc("start_generation", { p_user_id: second.U.id, p_generation_id: second.id, p_from_bank: true });
    expect(error).toBeNull();
    expect(started.source).toBe("biblioteca");
    expect((await driveGeneration(admin(), second.id, noAi, 600_000)).state).toBe("completed");

    const { data: g } = await second.U.client.from("generations").select("status, questions, simulator_html_path, steps_run").eq("id", second.id).single();
    expect(g!.status).toBe("completed");
    expect(g!.questions).toHaveLength(20);
    expect(g!.steps_run).toBe(0);
    const html = await (await admin().storage.from("simulators").download(g!.simulator_html_path)).data!.text();
    expect(html).toContain(`clave:"${opec}"`);
    expect((await second.U.client.rpc("my_credit_balance")).data).toBe(0);
    const { data: row } = await admin().from("job_banks").select("uses").eq("opec", opec).single();
    expect(row!.uses).toBe(1);
  });

  it("solo reemplaza el banco si el nuevo tiene más preguntas; el admin puede retirarlo", async () => {
    const opec = opecFor();
    const big = await draft("big", opec, true, 20);
    await admin().rpc("start_generation", { p_user_id: big.U.id, p_generation_id: big.id });
    await driveGeneration(admin(), big.id, once(fakeProvider()), 600_000);
    const small = await draft("small", opec, true, 10);
    await admin().rpc("start_generation", { p_user_id: small.U.id, p_generation_id: small.id });
    await driveGeneration(admin(), small.id, once(fakeProvider()), 600_000);
    const { data: row } = await admin().from("job_banks").select("question_count, source_generation_id").eq("opec", opec).single();
    expect(row!.question_count).toBe(20);
    expect(row!.source_generation_id).toBe(big.id);

    await admin().from("job_banks").update({ enabled: false }).eq("opec", opec);
    expect(await findBank(admin(), opec)).toBeNull();
    const late = await draft("late", opec, false);
    const { error } = await admin().rpc("start_generation", { p_user_id: late.U.id, p_generation_id: late.id, p_from_bank: true });
    expect(error?.message).toContain("sin_biblioteca");
  });
});
