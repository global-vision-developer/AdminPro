
"use client";

import React from 'react';
import { Button } from '@/components/ui/button';
import { submitTestAnket } from '@/lib/actions/anketActions';

export function CreateTestAnketButton() {
    const [loading, setLoading] = React.useState(false);
    
    const handleClick = async () => {
        setLoading(true);
        try {
            await submitTestAnket({
                name: "Тест Өргөдөл " + Math.floor(Math.random() * 100),
                email: `test${Math.floor(Math.random() * 1000)}@example.com`,
                phoneNumber: "99001122",
                cvLink: "https://example.com/cv.pdf",
                message: "Энэ бол туршилтын зорилгоор автоматаар үүсгэсэн анкет юм."
            });
            // Optionally, add a success toast or refresh logic here if needed
        } catch (error) {
            console.error("Failed to submit test anket:", error);
            // Optionally, add an error toast here
        } finally {
            setLoading(false);
        }
    };

    return (
        <Button onClick={handleClick} disabled={loading} variant="outline" size="sm">
            {loading ? "Түр хүлээнэ үү..." : "Тест Анкет Нэмэх"}
        </Button>
    );
}
