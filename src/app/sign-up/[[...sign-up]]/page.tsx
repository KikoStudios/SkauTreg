import { SignUp } from "@clerk/nextjs";
import AnimatedBackground from "../../../components/auth/AnimatedBackground";

export default function Page() {
    return (
        <AnimatedBackground>
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
                <SignUp 
                    appearance={{
                        elements: {
                            rootBox: "mx-auto",
                            card: "shadow-lg"
                        }
                    }}
                />
            </div>
        </AnimatedBackground>
    );
}
