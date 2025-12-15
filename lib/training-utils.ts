// lib/training-utils.ts
// Helper functions for training module navigation and progress

export interface NextModuleResult {
  nextModuleId: string | null;
  currentModuleOrder: number;
  totalModules: number;
  isLastModule: boolean;
}

/**
 * Get the next module in sequence after the current module
 * @param moduleId - Current module ID
 * @returns Next module information or null if last module
 */
export async function getNextModule(moduleId: string): Promise<NextModuleResult> {
  try {
    // Fetch all active modules ordered by order field
    const response = await fetch("/api/training/modules?active=true");
    if (!response.ok) {
      throw new Error("Failed to fetch modules");
    }

    const data = await response.json();
    const modules = data.modules || [];

    // Sort modules by order
    const sortedModules = modules.sort((a: any, b: any) => a.order - b.order);

    // Find current module
    const currentModule = sortedModules.find((m: any) => m.id === moduleId);
    if (!currentModule) {
      return {
        nextModuleId: null,
        currentModuleOrder: 0,
        totalModules: sortedModules.length,
        isLastModule: false,
      };
    }

    // Find next module with order > current order
    const nextModule = sortedModules.find((m: any) => m.order > currentModule.order);

    return {
      nextModuleId: nextModule?.id || null,
      currentModuleOrder: currentModule.order,
      totalModules: sortedModules.length,
      isLastModule: !nextModule,
    };
  } catch (error) {
    console.error("Error getting next module:", error);
    return {
      nextModuleId: null,
      currentModuleOrder: 0,
      totalModules: 0,
      isLastModule: false,
    };
  }
}
