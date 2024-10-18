/* eslint formatjs/no-literal-string-in-jsx:0 */
import { Divider, IconButton, useTheme } from "@mui/material";
import AppBar from "@mui/material/AppBar";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import ChevronLeftOutlinedIcon from "@mui/icons-material/ChevronLeftOutlined";
import BuildCircle from "@mui/icons-material/BuildCircle";
import { SystemStyleObject, Theme } from "@mui/system";

const boxStyles: SystemStyleObject<Theme> = {
  border: `1px solid black`,
  height: "fit-content",
  width: "fit-content",
  alignItems: "center",
  p: "0.25rem 0.5rem",
  borderRadius: "0.25rem",
  bgcolor: "background.paper",
  display: "inline",
  fontWeight: 500,
  letterSpacing: "0.009rem",
  fontSize: "0.75rem",
};

export const Header = () => {
  const theme = useTheme();
  const styles = { ...boxStyles };
  return (
    <AppBar
      position="static"
      color="default"
      elevation={0}
      sx={{
        backgroundColor: "white",
        boxShadow: "0px 2px 4px rgba(0, 0, 0, 0.1)",
        position: {
          xs: "fixed", // Apply these styles for mobile screens
        },
        top: {
          xs: "50px",
        },
        width: {
          xs: "100%",
        },
        zIndex: {
          xs: 3,
        },
      }}
    >
      <Box display="flex" alignItems="center" padding={1}>
        <Stack direction="row" alignItems="center" spacing={1}>
          <IconButton color="primary">
            <ChevronLeftOutlinedIcon />
          </IconButton>
          <Divider
            orientation="vertical"
            sx={{
              width: "1px",
              height: "32px",
              color: "text.secondary",
            }}
          />
          <BuildCircle sx={{ color: theme.palette.text.secondary }} />
          <Box sx={styles} component="span">
            "WM57 EOR"
          </Box>
        </Stack>
      </Box>
    </AppBar>
  );
};
