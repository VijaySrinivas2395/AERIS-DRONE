import torch
import torch.nn as nn
import torchvision.models as models


class ResNetUNet(nn.Module):

    def __init__(self):
        super().__init__()

        base_model = models.resnet34(weights="DEFAULT")

        self.encoder0 = nn.Sequential(
            base_model.conv1,
            base_model.bn1,
            base_model.relu
        )

        self.encoder1 = nn.Sequential(
            base_model.maxpool,
            base_model.layer1
        )

        self.encoder2 = base_model.layer2
        self.encoder3 = base_model.layer3
        self.encoder4 = base_model.layer4

        self.up1 = nn.ConvTranspose2d(512,256,2,2)
        self.up2 = nn.ConvTranspose2d(256,128,2,2)
        self.up3 = nn.ConvTranspose2d(128,64,2,2)
        self.up4 = nn.ConvTranspose2d(64,64,2,2)

        self.final = nn.Conv2d(64,1,1)

    def forward(self,x):

        x1 = self.encoder0(x)
        x2 = self.encoder1(x1)
        x3 = self.encoder2(x2)
        x4 = self.encoder3(x3)
        x5 = self.encoder4(x4)

        x = self.up1(x5)
        x = self.up2(x)
        x = self.up3(x)
        x = self.up4(x)

        x = self.final(x)

        return x

if __name__ == "__main__":
    print("Initializing ResNetUNet model...")
    model = ResNetUNet()
    print("Model initialized successfully!")
    dummy_input = torch.randn(1, 3, 256, 256)
    output = model(dummy_input)
    print(f"Output shape: {output.shape}")