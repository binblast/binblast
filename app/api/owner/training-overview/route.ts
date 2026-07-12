import { NextResponse } from "next/server";
import { getAllEmployees } from "@/lib/employee-utils";
import { getRequiredModules } from "@/lib/training-modules";
import { getModuleProgress } from "@/lib/training-certification";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const employees = await getAllEmployees();
    const requiredModules = getRequiredModules();
    const totalModules = requiredModules.length;

    const results = await Promise.all(
      employees.map(async (employee) => {
        const moduleResults = await Promise.all(
          requiredModules.map((module) => getModuleProgress(employee.id, module.id))
        );

        const completedModules = moduleResults.filter((m) => m.completed).length;
        const certified = completedModules === totalModules && totalModules > 0;

        return {
          id: employee.id,
          name: `${employee.firstName} ${employee.lastName}`,
          email: employee.email,
          certified,
          completedModules,
          totalModules,
          modules: requiredModules.map((module, index) => ({
            moduleId: module.id,
            moduleName: module.name,
            completed: moduleResults[index].completed,
            quizScore: moduleResults[index].quizScore,
          })),
        };
      })
    );

    return NextResponse.json({ employees: results }, { status: 200 });
  } catch (error: unknown) {
    console.error("[Owner Training Overview] Error:", error);
    const message = error instanceof Error ? error.message : "Failed to load training overview";
    return NextResponse.json({ message }, { status: 500 });
  }
}
