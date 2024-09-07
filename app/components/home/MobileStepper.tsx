import { Step, styled } from "@mui/material";

interface IStepStyled {
    active: boolean;
}

const StyledStep = styled(Step)<IStepStyled>
    (({ theme, active }: any) => ({
        float: 'left',
        height: '12px',
        width: '12px',
        marginLeft: '10px',
        borderRadius: '50%',
        backgroundColor: active ? theme.palette.secondary.main : theme.palette.grey[300],
        cursor: 'pointer',
    }));

export const MobileStepper = ({ activeStep, steps, onStepClick, className }: any) => (
    <Step className={className}>
        {
            Array.from(Array(steps).keys()).map(step => (
                <StyledStep
                    key={step}
                    active={activeStep === step}
                    onClick={
                        () => onStepClick(step)
                    }
                />
            ))
        }
    </Step>
);
