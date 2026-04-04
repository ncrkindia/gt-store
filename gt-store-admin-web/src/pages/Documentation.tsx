const API_GATEWAY_URL = 'https://gts-api.slpro.in';
const SERVICE_DOCS = [
    { name: 'User Service', url: '/api/users/v3/api-docs' },
    { name: 'Product Service', url: '/api/products/v3/api-docs' },
    { name: 'Cart Service', url: '/api/cart/v3/api-docs' },
    { name: 'Order Service', url: '/api/orders/v3/api-docs' },
    { name: 'Inventory Service', url: '/api/inventory/v3/api-docs' },
    { name: 'Payment Service', url: '/api/payments/v3/api-docs' },
    { name: 'Search Service', url: '/api/search/v3/api-docs' }
];

const Documentation = () => {
    const downloadPostmanCollection = async () => {
        try {
            const mergedSpec: any = {
                openapi: "3.0.1",
                info: {
                    title: "GT Store Aggregated API",
                    version: "1.0.0",
                    description: "Combined API documentation for all GT Store microservices"
                },
                paths: {},
                components: {
                    schemas: {},
                    securitySchemes: {}
                }
            };

            for (const service of SERVICE_DOCS) {
                try {
                    const response = await fetch(`${API_GATEWAY_URL}${service.url}`);
                    if (!response.ok) continue;
                    const spec = await response.json();

                    // Merge paths
                    if (spec.paths) {
                        Object.assign(mergedSpec.paths, spec.paths);
                    }

                    // Merge components
                    if (spec.components) {
                        if (spec.components.schemas) {
                            Object.assign(mergedSpec.components.schemas, spec.components.schemas);
                        }
                        if (spec.components.securitySchemes) {
                            Object.assign(mergedSpec.components.securitySchemes, spec.components.securitySchemes);
                        }
                    }
                } catch (err) {
                    console.warn(`Failed to fetch docs for ${service.name}:`, err);
                }
            }

            const blob = new Blob([JSON.stringify(mergedSpec, null, 2)], { type: 'application/json' });
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = 'gt_store_complete_collection.json';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Error downloading Postman collection:', error);
            alert('Failed to download complete Postman collection.');
        }
    };


    return (
        <div style={{ width: '100%', height: 'calc(100vh - 100px)', padding: '20px', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h1 style={{ margin: 0 }}>API Documentation</h1>
                <button 
                    onClick={downloadPostmanCollection}
                    className="btn-primary"
                    style={{ padding: '10px 20px', fontSize: '14px' }}
                >
                    Download Postman Collection
                </button>
            </div>
            <div className="card-mochi" style={{ width: '100%', height: '100%', overflow: 'hidden', padding: 0 }}>
                <iframe
                    src="https://gts-api.slpro.in/swagger-ui.html"
                    title="GT Store API Documentation"
                    style={{ width: '100%', height: '100%', border: 'none' }}
                />
            </div>
        </div>
    );
};

export default Documentation;
