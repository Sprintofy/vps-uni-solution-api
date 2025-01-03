export const buildNavigationStructure = (
    access: any[],             // Final structure to store navigation access data.
    sortedPages: any[],        // Sorted pages list (pages related to roles, orgs, etc.)
    entityPages: any[],        // Pages the specific entity has access to (rolePages, orgPages, etc.)
    allCtas: any[],            // All available CTAs.
    ctaLookup: any             // Lookup table to check CTA access for the entity.
) => {
    sortedPages.forEach((page: any) => {
        // Creating the parent page structure
        const parentEntry = {
            page_id: page.page_id,
            page_label: page.page_label,
            page_icon: page.page_icon,
            page_path: page.page_path,
            checked: entityPages.some((ep: any) => ep.page_id === page.page_id), // True if entity has access
            sub_pages: []
        };

        // If parent_id is 0, this page is at the root level
        if (page.parent_id === 0) {
            access.push(parentEntry);
        } else {
            // Find the parent page where this page belongs
            const parentPage = access.find(p => p.page_id === page.parent_id);

            if (parentPage) {
                // Create the child page entry
                const childEntry = {
                    page_id: page.page_id,
                    page_label: page.page_label,
                    page_icon: page.page_icon,
                    page_path: page.page_path,
                    checked: entityPages.some((ep: any) => ep.page_id === page.page_id), // True if entity has access
                    ctas: allCtas.filter((cta: any) => cta.page_id === page.page_id).map((cta: any) => ({
                        ...cta,
                        checked: !!ctaLookup[page.page_id]?.[cta.page_cta_id] // True if entity has access to this CTA
                    }))
                };
                parentPage.sub_pages.push(childEntry); // Add child entry to the parent page
            }
        }
    });
};
