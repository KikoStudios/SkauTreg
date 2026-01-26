import styles from './Button.module.css';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'outline' | 'ghost';
    children: React.ReactNode;
}

export default function Button({ variant = 'primary', children, className, ...props }: ButtonProps) {
    return (
        <button
            className={`${styles.button} ${styles[variant]} ${className || ''}`}
            {...props}
        >
            {children}
        </button>
    );
}
