import { DarkMode, LightMode } from '@mui/icons-material';
import { useTheme } from './theme-context.js';

const ThemeToggle = () => {
    const { theme, toggleTheme } = useTheme();
    const nextTheme = theme === 'light' ? 'dark' : 'light';

    return (
        <button
            className="theme-toggle"
            type="button"
            onClick={toggleTheme}
            aria-label={`Switch to ${nextTheme} mode`}
            title={`Switch to ${nextTheme} mode`}
        >
            {theme === 'light' ? <DarkMode /> : <LightMode />}
            <span>{theme === 'light' ? 'Dark' : 'Light'}</span>
        </button>
    );
};

export default ThemeToggle;
