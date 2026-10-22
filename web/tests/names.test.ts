import { describe, expect, it } from "vitest";
import { displayName, fixAcronyms, roleNoun } from "@/lib/generation/names";

describe("nombres legibles", () => {
  it("pasa los ejes en mayúsculas a forma de oración, con tildes y siglas", () => {
    expect(displayName("GESTION DOCUMENTAL Y TRAZABILIDAD DE EXPEDIENTES")).toBe("Gestión documental y trazabilidad de expedientes");
    expect(displayName("LIQUIDACION DE IMPUESTOS NACIONALES")).toBe("Liquidación de impuestos nacionales");
    expect(displayName("PROCEDIMIENTO DE FISCALIZACION Y LIQUIDACION TRIBUTARIA Y ADUANERA")).toBe("Procedimiento de fiscalización y liquidación tributaria y aduanera");
    expect(displayName("ESTRUCTURA ORGANIZACIONAL DE LA DIAN")).toBe("Estructura organizacional de la DIAN");
    expect(displayName("RAZONAMIENTO MATEMATICO")).toBe("Razonamiento matemático");
    expect(displayName("LAVADO DE ACTIVOS LA/FT Y OPERACIONES")).toBe("Lavado de activos LA/FT y operaciones");
  });
  it("respeta los nombres que ya traen minúsculas", () => {
    expect(displayName("Peticiones y CPACA")).toBe("Peticiones y CPACA");
  });
  it("saca el nombre del cargo sin código ni grado", () => {
    expect(roleNoun("Analista II 202 02")).toBe("analista");
    expect(roleNoun("Gestor I 301-01")).toBe("gestor");
    expect(roleNoun("Inspector IV 304-04")).toBe("inspector");
  });
  it("corrige siglas en minúscula", () => {
    expect(fixAcronyms("radicar un ros ante la uiaf por riesgo laft en la dian")).toBe("radicar un ROS ante la UIAF por riesgo LA/FT en la DIAN");
    expect(fixAcronyms("La rosa y el dianal")).toBe("La rosa y el dianal");
  });
});
